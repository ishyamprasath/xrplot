/**
 * Prediction Synthesis — AI-Powered 2036 Urban Panorama Generation
 * Uses Gemini 2.5 Flash Image (NanoBanana) directly to synthesize
 * a speculative streetscape / aerial panorama from satellite trend data.
 */

import { v2 as cloudinary } from 'cloudinary';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const IMAGE_MODEL = 'google/gemini-2.5-flash-image';

async function generateImageWithOpenRouter(prompt, { maxRetries = 3 } = {}) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'XRPlot',
        },
        body: JSON.stringify({ model: IMAGE_MODEL, messages: [{ role: 'user', content: prompt }] }),
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

const SCENE_PROMPTS = {
  main_street: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic street-level view of a MAIN COMMERCIAL STREET in ${ctx.locationName || 'an urban area'} in the year 2036.

Context: Built-up density ${ctx.urbanDensity}%, ${ctx.trend} trajectory.
Scene: A vibrant, clean, and pedestrian-friendly shopping avenue with modern storefronts, elegant signage, well-maintained public transport (modern trams or electric buses), organized street furniture, and improved urban lighting. Bustling but orderly and clean.
Style: Photorealistic, seamless 360° equirectangular, 2:1 feel, warm daylight, no text/watermarks.`,

  residential: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a RESIDENTIAL DISTRICT in ${ctx.locationName || 'an urban area'} in the year 2036.

Context: Built-up density ${ctx.urbanDensity}%, ${ctx.trend} trajectory.
Scene: Modern apartment complexes with clean architectural lines, green balconies, organized parking, well-maintained common parks, paved walkways, and sustainable street lighting. A safe, clean, and family-friendly residential environment.
Style: Photorealistic, seamless 360° equirectangular, golden hour lighting, no text/watermarks.`,

  healthcare: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a HEALTHCARE CAMPUS in ${ctx.locationName || 'an urban area'} in the year 2036.

Context: Built-up density ${ctx.urbanDensity}%, ${ctx.trend} trajectory.
Scene: A modern medical campus with clean, professional architecture, spacious drop-off zones, landscaped healing gardens, glass facades, and well-organized patient facilities. A calm and efficient healthcare environment.
Style: Photorealistic, seamless 360° equirectangular, bright natural light, no text/watermarks.`,

  education: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of an EDUCATION CAMPUS in ${ctx.locationName || 'an urban area'} in the year 2036.

Context: Built-up density ${ctx.urbanDensity}%, ${ctx.trend} trajectory.
Scene: A modern educational campus with open-air learning spaces, contemporary architecture featuring glass and wood, student plazas with digital information kiosks, lush campus greenery, and dedicated cycling paths.
Style: Photorealistic, seamless 360° equirectangular, midday vibrant light, no text/watermarks.`,

  green_space: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of an URBAN PARK in ${ctx.locationName || 'an urban area'} in the year 2036.

Context: Built-up density ${ctx.urbanDensity}%, ${ctx.trend} trajectory.
Scene: A beautifully landscaped urban park with paved walking trails, serene water features, community seating areas, modern playground equipment, sustainable solar lighting, and well-maintained lawns between modern buildings.
Style: Photorealistic, seamless 360° equirectangular, lush greenery, soft morning light, no text/watermarks.`,

  tech_hub: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a TECH & BUSINESS HUB in ${ctx.locationName || 'an urban area'} in the year 2036.

Context: Built-up density ${ctx.urbanDensity}%, ${ctx.trend} trajectory.
Scene: A sophisticated business district with modern glass-and-steel office buildings, landscaped plazas, organized traffic management, underground parking, and clean, professional signage. A vibrant and productive commercial environment.
Style: Photorealistic, seamless 360° equirectangular, twilight blue-hour with interior glow, no text/watermarks.`,
};

async function generateSinglePanorama(prompt, sceneType, index) {
  console.log(`[ImageGen] Generating ${sceneType}[${index}]...`);
  console.log(`[ImageGen] Prompt length: ${prompt.length} chars`);

  let imageBuffer;
  try {
    imageBuffer = await generateImageWithOpenRouter(prompt);
    console.log(`[OpenRouter] Generated ${sceneType}[${index}], size:`, imageBuffer.length);
  } catch (modelErr) {
    console.error(`[ImageGen] OpenRouter error for ${sceneType}[${index}]:`, modelErr.message);
    throw new Error(`Image generation failed: ${modelErr.message}`);
  }

  if (!imageBuffer) {
    console.error(`[ImageGen] FAILED ${sceneType}[${index}]: No image generated`);
    throw new Error(`${sceneType}[${index}]: No image generated`);
  }

  console.log(`[ImageGen] Uploading ${sceneType}[${index}] to Cloudinary...`);
  console.log(`[ImageGen] Image buffer length: ${imageBuffer.length} bytes`);
  
  // Validate buffer data
  if (!imageBuffer || imageBuffer.length < 100) {
    throw new Error(`Invalid image data: buffer too short (${imageBuffer?.length || 0} bytes)`);
  }
  
  const uploadResponse = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'xrplot/predictions', resource_type: 'image', quality: 'auto', format: 'jpg' },
      (error, result) => {
        if (error) {
          console.error(`[ImageGen] Cloudinary upload failed:`, error.message);
          console.error(`[ImageGen] Cloudinary error details:`, JSON.stringify(error));
          reject(error);
        } else {
          console.log(`[ImageGen] Cloudinary upload success:`, result.secure_url);
          resolve(result);
        }
      }
    ).end(imageBuffer);
  });

  return {
    url: uploadResponse.secure_url,
    publicId: uploadResponse.public_id,
  };
}

export async function synthesize2036Panorama({ lat, lng, urbanDensity, confidence, ndbiTrend, locationName }) {
  // Puter.js doesn't require API key configuration

  const safeNdbi = Array.isArray(ndbiTrend) && ndbiTrend.length > 0 ? ndbiTrend : [0.3, 0.35];
  const trendDirection = safeNdbi[safeNdbi.length - 1] > safeNdbi[0] ? 'rapidly urbanizing' : 'stable or declining';
  const ctx = {
    lat, lng, urbanDensity, confidence, ndbiTrend: safeNdbi, locationName,
    trend: trendDirection,
  };

  const prompt = `Generate a highly photorealistic equirectangular 360-degree panoramic street-level view of the urban area near coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) in the year 2036.

Urban growth context:
- Current projected built-up density: ${urbanDensity}% of the landscape.
- Growth trajectory: ${trendDirection} over the last decade.
- Confidence in prediction: ${(confidence * 100).toFixed(0)}%.

Style guidelines:
- Modern, clean, and minimalist architectural aesthetic.
- Seamless 360° equirectangular layout (2:1 aspect ratio feel).
- Photorealistic lighting, shadows, and textures.
- Show modern and realistically evolved urban infrastructure — improved roads, sustainable energy elements, and well-organized public spaces.
- No text, no watermarks, no UI elements.

Return only the generated panoramic image.`;

  return generateSinglePanorama(prompt, 'default', 0);
}

export async function synthesizeScenePanoramas({ lat, lng, urbanDensity, confidence, ndbiTrend, locationName, hotspots }) {
  // Puter.js doesn't require API key configuration

  const safeNdbi = Array.isArray(ndbiTrend) && ndbiTrend.length > 0 ? ndbiTrend : [0.3, 0.35];
  const trendDirection = safeNdbi[safeNdbi.length - 1] > safeNdbi[0] ? 'rapidly urbanizing' : 'stable or declining';
  const ctx = {
    lat, lng, urbanDensity, confidence, ndbiTrend: safeNdbi, locationName,
    trend: trendDirection,
  };
  
  console.log(`[ImageGen] Starting panorama generation for ${hotspots?.length || 0} hotspots. Trend: ${trendDirection}`);

  const results = [];
  for (let i = 0; i < hotspots.length; i++) {
    const hotspot = hotspots[i];
    const promptFn = SCENE_PROMPTS[hotspot.type] || SCENE_PROMPTS.main_street;
    const prompt = promptFn(ctx);

    try {
      const panorama = await generateSinglePanorama(prompt, hotspot.type, i);
      results.push({
        hotspotId: hotspot.id,
        type: hotspot.type,
        ...panorama,
        generated: true,
      });
    } catch (err) {
      console.warn(`Failed to generate panorama for ${hotspot.type}:`, err.message);
      results.push({
        hotspotId: hotspot.id,
        type: hotspot.type,
        url: '',
        publicId: '',
        generated: false,
        error: err.message,
      });
    }
  }

  const successCount = results.filter(r => r.generated).length;
  console.log(`[ImageGen] Panorama generation complete: ${successCount}/${results.length} succeeded`);
  return results;
}
