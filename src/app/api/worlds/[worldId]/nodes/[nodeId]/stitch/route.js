import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { uploadImage } from '@/lib/cloudinary';
import sharp from 'sharp';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const STITCH_MODEL = 'google/gemini-2.5-flash-image';

const PANORAMA_WIDTH = 4096;
const PANORAMA_HEIGHT = 2048;
const MAX_UPLOAD_MB = 4.0;

/**
 * Preprocess input images: normalize size, validate, convert to base64.
 * Gemini works best with consistent, reasonably-sized inputs.
 */
async function preprocessImages(imageUrls) {
  const processed = [];
  for (const url of imageUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[Stitch] Failed to fetch image ${url}: ${response.status}`);
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate it's a real image
      const meta = await sharp(buffer).metadata();
      if (!meta.width || !meta.height) {
        console.warn(`[Stitch] Invalid image at ${url}`);
        continue;
      }

      // Normalize to 1024px wide max, good quality JPEG for Gemini
      const normalized = await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: false })
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();

      processed.push({
        base64: normalized.toString('base64'),
        mimeType: 'image/jpeg',
        originalWidth: meta.width,
        originalHeight: meta.height,
      });
      console.log(`[Stitch] Preprocessed image ${url}: ${meta.width}x${meta.height} -> 1024x1024`);
    } catch (e) {
      console.warn(`[Stitch] Failed to process image ${url}:`, e.message);
    }
  }
  return processed;
}

/**
 * Generate an image via OpenRouter using google/gemini-2.5-flash-image.
 * Sends prompt + reference images, extracts generated image from response.
 */
async function generateImageWithOpenRouter(prompt, inputImages = [], { maxRetries = 3 } = {}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  // Build OpenAI-compatible message with text + images
  const content = [
    { type: 'text', text: prompt },
    ...inputImages.map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    })),
  ];

  const messages = [{ role: 'user', content }];

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[OpenRouter Stitch] Attempt ${attempt}/${maxRetries} with model ${STITCH_MODEL}`);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'XRPlot',
        },
        body: JSON.stringify({
          model: STITCH_MODEL,
          messages,
          // Some image models benefit from a system prompt
          ...(attempt === 1 && {
            // Only on first attempt, no extra params
          }),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const assistantMsg = data.choices?.[0]?.message;
      const rawContent = assistantMsg?.content || '';

      if (!rawContent) {
        throw new Error('OpenRouter returned empty content');
      }

      // Extract image from markdown data URL: ![alt](data:image/...;base64,...)
      const mdMatch = rawContent.match(/!\[.*?\]\((data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+))\)/);
      if (mdMatch && mdMatch[2]) {
        const base64 = mdMatch[2];
        const buffer = Buffer.from(base64, 'base64');
        console.log(`[OpenRouter Stitch] Image extracted from markdown: ${buffer.length} bytes`);
        return buffer;
      }

      // Fallback: look for any raw data URI in the content
      const dataUriMatch = rawContent.match(/data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/);
      if (dataUriMatch && dataUriMatch[1]) {
        const buffer = Buffer.from(dataUriMatch[1], 'base64');
        console.log(`[OpenRouter Stitch] Image extracted from data URI: ${buffer.length} bytes`);
        return buffer;
      }

      // If response is just base64 without data URI prefix
      const bareBase64Match = rawContent.match(/^([A-Za-z0-9+/=]{100,})$/);
      if (bareBase64Match && bareBase64Match[1]) {
        const buffer = Buffer.from(bareBase64Match[1], 'base64');
        console.log(`[OpenRouter Stitch] Image extracted from bare base64: ${buffer.length} bytes`);
        return buffer;
      }

      throw new Error('Could not extract image from OpenRouter response. Raw content preview: ' + rawContent.slice(0, 200));
    } catch (err) {
      lastError = err;
      console.error(`[OpenRouter Stitch] Attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`[OpenRouter Stitch] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`OpenRouter image generation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Build a rich, detailed prompt for Gemini to generate a high-quality 360 panorama.
 */
function buildPanoramaPrompt(node, imageCount) {
  const locationHint = node.label || node.name || 'this location';
  return `You are an expert 360° panorama photographer and AI image synthesizer.

TASK: Create a single, seamless, photorealistic equirectangular 360-degree panorama image (2:1 aspect ratio, 4096x2048) of "${locationHint}".

INPUT: You have been provided with ${imageCount} real photographs of the same physical space taken from different angles. Use these as reference for:
- The exact architecture, colors, textures, and materials
- The spatial layout and proportions of the environment
- The lighting conditions and time of day
- Key objects, furniture, vegetation, or structures present

REQUIREMENTS:
1. Output MUST be a full 360° equirectangular panorama (seamless left-right wrap, no visible edges).
2. Blend all perspectives into one coherent space with perfect perspective continuity.
3. Maintain photorealistic detail: correct shadows, reflections, natural lighting, and depth.
4. Do NOT invent objects that are not in the source photos. Stay faithful to the actual space.
5. Fix any exposure differences between source views so the final panorama has uniform lighting.
6. Fill in gaps between views using logical architectural inference, not imagination.
7. Ensure the horizon is perfectly level and the floor/ground is consistent.
8. No text, watermarks, UI elements, or borders.
9. The output must be a single complete image, not a collage or grid.

Return only the generated panoramic image.`;
}

/**
 * Create a fallback panorama using sharp if the AI model fails completely.
 * This stitches images side-by-side and scales to panorama dimensions.
 */
async function createFallbackPanorama(imageBuffers) {
  console.log('[Stitch] Creating sharp fallback panorama...');
  try {
    const composites = [];
    const targetSliceWidth = Math.floor(PANORAMA_WIDTH / imageBuffers.length);
    const targetSliceHeight = PANORAMA_HEIGHT;

    for (let i = 0; i < imageBuffers.length; i++) {
      const slice = await sharp(imageBuffers[i])
        .resize(targetSliceWidth, targetSliceHeight, { fit: 'cover' })
        .toBuffer();
      composites.push({
        input: slice,
        left: i * targetSliceWidth,
        top: 0,
      });
    }

    const canvas = sharp({
      create: {
        width: PANORAMA_WIDTH,
        height: PANORAMA_HEIGHT,
        channels: 3,
        background: { r: 20, g: 20, b: 30 },
      },
    });

    const fallbackBuffer = await canvas.composite(composites).jpeg({
      quality: 85,
      progressive: true,
      mozjpeg: true,
    }).toBuffer();

    console.log(`[Stitch] Fallback panorama created: ${fallbackBuffer.length} bytes`);
    return fallbackBuffer;
  } catch (e) {
    console.error('[Stitch] Fallback panorama failed:', e);
    throw e;
  }
}

/**
 * Compress panorama to fit under upload limit while keeping quality high.
 */
async function compressPanorama(buffer) {
  let quality = 92;
  let result = await sharp(buffer)
    .resize(PANORAMA_WIDTH, PANORAMA_HEIGHT, { fit: 'cover' })
    .jpeg({ quality, progressive: true, mozjpeg: true, trellisQuantisation: true })
    .toBuffer({ resolveWithObject: true });

  let sizeMB = result.info.size / (1024 * 1024);
  console.log(`[Stitch] Panorama initial size: ${sizeMB.toFixed(2)}MB (quality ${quality})`);

  // Gradually reduce quality if oversized
  while (sizeMB > MAX_UPLOAD_MB && quality > 50) {
    quality -= 8;
    result = await sharp(buffer)
      .resize(PANORAMA_WIDTH, PANORAMA_HEIGHT, { fit: 'cover' })
      .jpeg({ quality, progressive: true, mozjpeg: true, trellisQuantisation: true })
      .toBuffer({ resolveWithObject: true });
    sizeMB = result.info.size / (1024 * 1024);
    console.log(`[Stitch] Compressed to ${sizeMB.toFixed(2)}MB (quality ${quality})`);
  }

  return result.data;
}

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, nodeId } = await params;

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => String(n.id) === String(nodeId));
    if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    if (!node.images || node.images.length === 0) {
      return NextResponse.json({ error: 'No images to stitch' }, { status: 400 });
    }

    node.status = 'stitching';
    await world.save();
    console.log(`[Stitch] Starting stitch for node ${nodeId} with ${node.images.length} images`);

    try {
      // 1. Fetch and preprocess all input images
      const imageUrls = node.images.map(img => img.url);
      const inputImages = await preprocessImages(imageUrls);

      if (inputImages.length === 0) {
        throw new Error('Failed to retrieve or process any images for stitching');
      }

      // 2. Generate 360 Panorama using Gemini NanoBanana
      const prompt = buildPanoramaPrompt(node, inputImages.length);
      let panoramaBuffer = null;
      let usedFallback = false;

      try {
        panoramaBuffer = await generateImageWithOpenRouter(prompt, inputImages, {
          maxRetries: 3,
        });
        console.log('[Stitch] AI panorama generated successfully via OpenRouter');
      } catch (aiErr) {
        console.error('[Stitch] AI generation failed:', aiErr.message);
        console.log('[Stitch] Falling back to sharp-based panorama...');

        // Fallback: create a panorama from source images using sharp
        const rawBuffers = inputImages.map(img => Buffer.from(img.base64, 'base64'));
        panoramaBuffer = await createFallbackPanorama(rawBuffers);
        usedFallback = true;
      }

      if (!panoramaBuffer || panoramaBuffer.length < 100) {
        throw new Error('Panorama buffer is empty or invalid after generation/fallback');
      }

      // 3. Final validation of the panorama image
      const finalMeta = await sharp(panoramaBuffer).metadata();
      console.log(`[Stitch] Panorama dimensions: ${finalMeta.width}x${finalMeta.height}`);

      // 4. Compress for upload
      const compressedBuffer = await compressPanorama(panoramaBuffer);

      // 5. Upload to Cloudinary
      const uploadResult = await uploadImage(
        compressedBuffer,
        `xrplot/${worldId}/panoramas`
      );
      console.log(`[Stitch] Uploaded panorama: ${uploadResult.url}`);

      // 6. Update node
      node.panoramaUrl = uploadResult.url;
      node.panoramaPublicId = uploadResult.publicId;
      node.status = 'ready';
      node.stitchMethod = usedFallback ? 'sharp-fallback' : 'ai-openrouter';
      await world.save();

      return NextResponse.json({
        panoramaUrl: uploadResult.url,
        status: 'ready',
        method: usedFallback ? 'sharp-fallback' : 'ai-openrouter',
      });

    } catch (stitchError) {
      console.error('[Stitch] Fatal stitch error:', stitchError);
      node.status = 'error';
      node.stitchError = stitchError.message;
      await world.save();
      throw stitchError;
    }

  } catch (error) {
    console.error('POST stitch error:', error);
    return NextResponse.json({ error: 'Stitching failed: ' + error.message }, { status: 500 });
  }
}
