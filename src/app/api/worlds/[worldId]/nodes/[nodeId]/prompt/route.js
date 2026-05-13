import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { v2 as cloudinary } from 'cloudinary';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const IMAGE_MODEL = 'google/gemini-2.5-flash-image';

async function generateImageWithOpenRouter(prompt, inputImages = [], { maxRetries = 3 } = {}) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const content = [
        { type: 'text', text: prompt },
        ...inputImages.map(img => ({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        })),
      ];
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'XRPlot',
        },
        body: JSON.stringify({ model: IMAGE_MODEL, messages: [{ role: 'user', content }] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';

      const md = raw.match(/!\[.*?\]\((data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+))\)/);
      if (md?.[2]) return Buffer.from(md[2], 'base64');

      const uri = raw.match(/data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/);
      if (uri?.[1]) return Buffer.from(uri[1], 'base64');

      const bare = raw.match(/^([A-Za-z0-9+/=]{100,})$/);
      if (bare?.[1]) return Buffer.from(bare[1], 'base64');

      throw new Error('No image in response');
    } catch (e) { lastError = e; if (attempt < maxRetries) await new Promise(r => setTimeout(r, attempt * 2000)); }
  }
  throw new Error(`Image gen failed: ${lastError.message}`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const { worldId, nodeId } = resolvedParams;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const promptText = formData.get('prompt');
    const targetImageUrl = formData.get('targetImageUrl');
    const targetImageIndex = formData.get('targetImageIndex');
    const referenceImage = formData.get('referenceImage');

    if (!promptText || !targetImageUrl) {
      return NextResponse.json({ error: 'Missing prompt or target image url' }, { status: 400 });
    }

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const nodeIndex = world.nodes.findIndex(n => String(n.id) === String(nodeId));
    if (nodeIndex === -1) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    // Build input images for NanoBanana (Gemini 2.5 Flash Image)
    const inputImages = [];

    // Add target image
    try {
      const response = await fetch(targetImageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      inputImages.push({ base64, mimeType: 'image/jpeg' });
    } catch (e) {
      console.warn('Failed to fetch target image:', e);
      return NextResponse.json({ error: 'Failed to fetch target image' }, { status: 400 });
    }

    // Add reference image if provided
    if (referenceImage && referenceImage.size > 0) {
      const arrayBuffer = await referenceImage.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      inputImages.push({ base64, mimeType: referenceImage.type || 'image/jpeg' });
    }

    // Call Gemini NanoBanana for image editing
    let imageBuffer;
    try {
      const editPrompt = `Edit this image based on: "${promptText}". ${referenceImage ? 'Use the reference image for style guidance.' : ''}`;

      imageBuffer = await generateImageWithOpenRouter(editPrompt, inputImages);

      console.log('[OpenRouter] Image edited successfully, size:', imageBuffer.length);
    } catch (e) {
      console.error('[OpenRouter] Error:', e);
      throw new Error(`Image editing failed: ${e.message}`);
    }

    if (!imageBuffer) {
      throw new Error("Failed to generate edited image.");
    }

    const imageBase64 = imageBuffer.toString('base64');
    const imageMimeType = 'image/jpeg';

    // Upload generated image to Cloudinary
    let newImageUrl = '';
    let newPublicId = '';

    try {
      const uploadResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          `data:${imageMimeType};base64,${imageBase64}`,
          { folder: 'xrplot/prompts' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });

      newImageUrl = uploadResponse.secure_url;
      newPublicId = uploadResponse.public_id;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return NextResponse.json({ error: 'Failed to save generated image to Cloudinary' }, { status: 500 });
    }

    // Update DB - save originals for revert, then replace the target image
    if (targetImageIndex === 'panorama') {
      const node = world.nodes[nodeIndex];
      if (!node.originalPanoramaUrl) {
        node.originalPanoramaUrl = node.panoramaUrl;
        node.originalPanoramaPublicId = node.panoramaPublicId;
      }
      node.panoramaUrl = newImageUrl;
      node.panoramaPublicId = newPublicId;
    } else {
      const idx = parseInt(targetImageIndex, 10);
      const img = world.nodes[nodeIndex].images[idx];
      if (!isNaN(idx) && img) {
        if (!img.originalUrl) {
          img.originalUrl = img.url;
          img.originalPublicId = img.publicId;
        }
        img.url = newImageUrl;
        img.publicId = newPublicId;
      }
    }

    world.markModified('nodes');
    await world.save();

    return NextResponse.json({ success: true, newImageUrl });
  } catch (error) {
    console.error('Prompt Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
