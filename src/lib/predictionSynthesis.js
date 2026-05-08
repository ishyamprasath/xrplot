/**
 * Prediction Synthesis — AI-Powered 2036 Urban Panorama Generation
 * Uses Gemini 3.1 Flash Image Preview (NanoBanana) to synthesize
 * a speculative streetscape / aerial panorama from satellite trend data.
 */

import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  
  let result;
  try {
    result = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview', // Correct model for image generation
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseModalities: ['IMAGE'] },
    });
  } catch (modelErr) {
    console.error(`[ImageGen] Model error for ${sceneType}[${index}]:`, modelErr.message);
    throw new Error(`Image generation failed: ${modelErr.message}`);
  }

  console.log(`[ImageGen] Raw result type:`, typeof result);
  console.log(`[ImageGen] Result keys:`, Object.keys(result || {}));
  
  // Log full result structure for debugging
  if (result) {
    console.log(`[ImageGen] Result has candidates:`, !!result.candidates);
    console.log(`[ImageGen] Result has response:`, !!result.response);
  }

  let imageBase64 = null;
  let imageMimeType = 'image/png';

  // Try multiple response formats
  const candidates = result?.candidates || result?.response?.candidates || [];
  console.log(`[ImageGen] Candidates count:`, candidates.length);
  
  if (candidates.length > 0 && candidates[0]?.content?.parts) {
    console.log(`[ImageGen] Parts count:`, candidates[0].content.parts.length);
    for (const part of candidates[0].content.parts) {
      console.log(`[ImageGen] Part type:`, Object.keys(part).join(', '));
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        imageMimeType = part.inlineData.mimeType || 'image/png';
        console.log(`[ImageGen] Found inlineData image for ${sceneType}[${index}], size: ${imageBase64?.length || 0} chars`);
        break;
      }
    }
  }

  // Fallback: check if result has a .media or .images property (newer SDK versions)
  if (!imageBase64 && result?.media) {
    imageBase64 = result.media;
    console.log(`[ImageGen] Found image in .media property`);
  }

  if (!imageBase64) {
    let reason = 'No image was generated by the AI.';
    let responseText = '';
    if (candidates.length > 0 && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.text) { 
          responseText += part.text + ' ';
        }
      }
    }
    if (responseText.trim()) {
      reason = `AI response: ${responseText.trim().substring(0, 200)}`;
    }
    console.error(`[ImageGen] FAILED ${sceneType}[${index}]:`, reason);
    throw new Error(`${sceneType}[${index}]: ${reason}`);
  }

  console.log(`[ImageGen] Uploading ${sceneType}[${index}] to Cloudinary...`);
  console.log(`[ImageGen] Image base64 length: ${imageBase64.length} chars`);
  console.log(`[ImageGen] MIME type: ${imageMimeType}`);
  
  // Validate base64 data
  if (!imageBase64 || imageBase64.length < 100) {
    throw new Error(`Invalid image data: base64 too short (${imageBase64?.length || 0} chars)`);
  }
  
  const uploadResponse = await new Promise((resolve, reject) => {
    const uploadData = `data:${imageMimeType};base64,${imageBase64}`;
    console.log(`[ImageGen] Upload data length: ${uploadData.length} chars`);
    
    cloudinary.uploader.upload(
      uploadData,
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
    );
  });

  return {
    url: uploadResponse.secure_url,
    publicId: uploadResponse.public_id,
  };
}

export async function synthesize2036Panorama({ lat, lng, urbanDensity, confidence, ndbiTrend, locationName }) {
  // Fail-safe: allow the pipeline/UI to work even if Gemini/Cloudinary aren't configured.
  if (!process.env.GEMINI_API_KEY) {
    return { url: '', publicId: '', generated: false };
  }

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
  // Fail-safe: generate empty panoramas (but still create the predicted city graph)
  // when Gemini isn't configured. This keeps Next.js routes from crashing.
  if (!process.env.GEMINI_API_KEY) {
    console.log('[ImageGen] No GEMINI_API_KEY configured, skipping image generation');
    return (hotspots || []).map((hotspot) => ({
      hotspotId: hotspot.id,
      type: hotspot.type,
      url: '',
      publicId: '',
      generated: false,
      error: 'GEMINI_API_KEY not configured',
    }));
  }

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
