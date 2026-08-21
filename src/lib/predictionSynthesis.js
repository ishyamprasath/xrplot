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
          'X-Title': 'XRPlot-Earth',
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
  vanishing_green: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic street-level view of a VANISHING GREEN BELT corridor in ${ctx.locationName || 'an urban area'} in DYSTOPIAN 2036 if no action taken.
Context: NDVI collapsed ${ctx.ndviTrend}, LST +${ctx.tempRise}°C, green cover ${ctx.greenCover}% lost.
Dystopia Scene: Barren avenue, stumps where trees stood, cracked soil, heat haze, concrete replacing canopy. Show environmental loss visceral. Yet hint where Miyawaki forest COULD regenerate.
Style: Photorealistic, 360° equirectangular, harsh midday heat light, dusty atmosphere, no text/watermarks.`,

  heat_island: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of an URBAN HEAT ISLAND junction in ${ctx.locationName || 'an urban area'} in DYSTOPIAN 2036.
Context: LST +${ctx.tempRise}°C, built-up ${ctx.urbanDensity}%, NDVI declining.
Scene: Shimmering asphalt, heat mirage, AC units straining, few shade trees, people seeking shade. Show oppressive heat. Cool-roof version would be 3°C cooler - visualize heat dome.
Style: Photorealistic, 360° equirectangular, harsh sun, heat distortion, no text.`,

  flood_zone: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a FLOOD-PRONE BASIN in ${ctx.locationName || 'an urban area'} in monsoon 2036 DYSTOPIA.
Context: Wetlands lost, water stress ${ctx.waterStress}/100.
Scene: Concrete drains overflowing, 0.6m brown water in street, stranded vehicles, failed drainage. Contrast with restored wetland that would absorb flood.
Style: Photorealistic, 360° equirectangular, overcast monsoon, water reflections, no text.`,

  air_corridor: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of an AIR POLLUTION CORRIDOR in ${ctx.locationName || 'an urban area'} in SMOGGY 2036.
Context: AQI 168, PM2.5 doubled with sprawl.
Scene: Traffic artery choked, smoggy haze, muted sun, people masked, grey sky. Green buffer + EV transit would cut 42% pollution.
Style: Photorealistic, 360° equirectangular, smoggy diffused light, atmospheric haze, no text.`,

  eco_restored: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a REGENERATED OASIS - the HOPEFUL GREEN FUTURE 2036 in ${ctx.locationName || 'an urban area'} IF WE ACT NOW.
Context: Regeneration success: Miyawaki forest, cool roofs, revived lake, ${ctx.greenCover}% green uplift.
Scene: Lush community forest with dense native trees, clean revived lake, kids playing, birds, cool shade 2.8°C cooler, vibrant biodiversity. Show what intervention achieves - the anti-dystopia.
Style: Photorealistic, 360° equirectangular, golden morning light, lush saturated greens, hopeful, no text.`,

  water_stress: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a WATER STRESS ZONE in ${ctx.locationName || 'an urban area'} in ARID 2036.
Context: Groundwater -12m, lakes dried.
Scene: Cracked dry lake bed, dry borewell, parched earth, plastic in dry nullah. Rain gardens + recharge pits would restore water.
Style: Photorealistic, 360° equirectangular, harsh dry light, cracked texture detail, no text.`,

  main_street: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic street-level view of a CLIMATE-IMPACTED MAIN STREET in ${ctx.locationName || 'an urban area'} DYSTOPIAN 2036.
Context: Built-up ${ctx.urbanDensity}%, heat +${ctx.tempRise}°C.
Scene: Commercial street suffering heat, few trees, AC heat exhaust, faded. Show environmental cost of unchecked growth.
Style: Photorealistic, 360° equirectangular, warm harsh daylight, no text.`,
  residential: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a RESIDENTIAL HEAT TRAP in ${ctx.locationName || 'an urban area'} 2036.
Context: Dense housing, no ventilation, heat trapped.
Scene: Apartment blocks with tiny balconies, no green, rooftop heat shimmer, residents on shaded balconies. Rooftop gardens would cool.
Style: Photorealistic, 360° equirectangular, hot afternoon, no text.`,
  healthcare: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a HEALTH CAMPUS OVERWHELMED by heat-related illness in ${ctx.locationName || 'an urban area'} 2036.
Scene: Hospital with shade struggles, patients in heat, but healing garden oasis shows resilience.
Style: Photorealistic, 360° equirectangular, bright harsh light, no text.`,
  education: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of an EDUCATION CAMPUS as CLIMATE SHELTER in ${ctx.locationName || 'an urban area'} 2036 GREEN FUTURE.
Scene: School with green rooftop, rain harvesting, Miyawaki learning forest, cool shaded courtyards.
Style: Photorealistic, 360° equirectangular, soft hopeful light, no text.`,
  green_space: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a VANISHING PARK vs REVIVED PARK split in ${ctx.locationName || 'an urban area'} 2036.
Scene: Half barren dusty park half lush revived forest park - show the choice.
Style: Photorealistic, 360° equirectangular, contrasting light, no text.`,
  tech_hub: (ctx) => `Generate a highly photorealistic equirectangular 360-degree panoramic view of a BUSINESS DISTRICT as COOL-ROOF LAB in ${ctx.locationName || 'an urban area'} GREEN FUTURE 2036.
Scene: Offices with white cool roofs, solar, green terraces, 3°C cooler than dystopian glass towers.
Style: Photorealistic, 360° equirectangular, bright clean light, no text.`,
};

async function generateSinglePanorama(prompt, sceneType, index) {
  console.log(`[ImageGen-Earth] Generating ${sceneType}[${index}]...`);
  let imageBuffer;
  try {
    imageBuffer = await generateImageWithOpenRouter(prompt);
    console.log(`[OpenRouter] Generated ${sceneType}[${index}], size:`, imageBuffer.length);
  } catch (modelErr) {
    console.error(`[ImageGen] OpenRouter error for ${sceneType}[${index}]:`, modelErr.message);
    throw new Error(`Image generation failed: ${modelErr.message}`);
  }
  if (!imageBuffer || imageBuffer.length < 100) throw new Error(`Invalid image data: buffer too short (${imageBuffer?.length || 0} bytes)`);
  const uploadResponse = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'xrplot/earth-2036', resource_type: 'image', quality: 'auto', format: 'jpg' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(imageBuffer);
  });
  return { url: uploadResponse.secure_url, publicId: uploadResponse.public_id };
}

export async function synthesize2036Panorama({ lat, lng, urbanDensity, confidence, ndbiTrend, locationName, ndviTrend, lstTrend, greenCover, waterStress }) {
  const safeNdbi = Array.isArray(ndbiTrend) && ndbiTrend.length > 0 ? ndbiTrend : [0.3, 0.35];
  const trendDirection = safeNdbi[safeNdbi.length - 1] > safeNdbi[0] ? 'rapidly urbanizing & heating' : 'stable';
  const tempRise = lstTrend && lstTrend.length > 1 ? (lstTrend[lstTrend.length-1]-lstTrend[0]).toFixed(1) : '2.4';
  const ndviTrendStr = ndviTrend && ndviTrend.length ? `${ndviTrend[0].toFixed(2)}->${ndviTrend[ndviTrend.length-1].toFixed(2)}` : '0.52->0.31 declining';
  const ctx = { lat, lng, urbanDensity, confidence, ndbiTrend: safeNdbi, locationName, trend: trendDirection, tempRise, ndviTrend: ndviTrendStr, greenCover: greenCover||28, waterStress: waterStress||62 };
  const prompt = `Generate a highly photorealistic equirectangular 360-degree panoramic view of ${locationName || 'this area'} in CLIMATE DYSTOPIA 2036 vs GREEN FUTURE.
Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) | Density ${urbanDensity}% | ${trendDirection} | Temp +${tempRise}°C | NDVI ${ndviTrendStr}
Show environmental cost: heat island, green loss, or hopeful regeneration with Miyawaki/lakes/cool roofs.
Photorealistic, 360° equirectangular, no text/watermarks. Return only image.`;
  return generateSinglePanorama(prompt, 'default', 0);
}

export async function synthesizeScenePanoramas({ lat, lng, urbanDensity, confidence, ndbiTrend, locationName, hotspots, ndviTrend, lstTrend, greenCover, waterStress }) {
  const safeNdbi = Array.isArray(ndbiTrend) && ndbiTrend.length > 0 ? ndbiTrend : [0.3, 0.35];
  const trendDirection = safeNdbi[safeNdbi.length - 1] > safeNdbi[0] ? 'rapidly urbanizing & heating' : 'stable';
  const tempRise = lstTrend && lstTrend.length > 1 ? (lstTrend[lstTrend.length-1]-lstTrend[0]).toFixed(1) : '2.4';
  const ndviTrendStr = ndviTrend && ndviTrend.length ? `${ndviTrend[0].toFixed(2)}->${ndviTrend[ndviTrend.length-1].toFixed(2)}` : '0.52->0.31';
  const ctx = { lat, lng, urbanDensity, confidence, ndbiTrend: safeNdbi, locationName, trend: trendDirection, tempRise, ndviTrend: ndviTrendStr, greenCover: greenCover||28, waterStress: waterStress||62 };
  console.log(`[ImageGen-Earth] Starting eco-panorama generation for ${hotspots?.length || 0} hotspots. Temp +${tempRise}°C`);
  const results = [];
  for (let i = 0; i < hotspots.length; i++) {
    const hotspot = hotspots[i];
    const promptFn = SCENE_PROMPTS[hotspot.type] || SCENE_PROMPTS.vanishing_green;
    const prompt = promptFn(ctx);
    try {
      const panorama = await generateSinglePanorama(prompt, hotspot.type, i);
      results.push({ hotspotId: hotspot.id, type: hotspot.type, ...panorama, generated: true });
    } catch (err) {
      console.warn(`Failed to generate eco-panorama for ${hotspot.type}:`, err.message);
      results.push({ hotspotId: hotspot.id, type: hotspot.type, url: '', publicId: '', generated: false, error: err.message });
    }
  }
  const successCount = results.filter(r => r.generated).length;
  console.log(`[ImageGen-Earth] Complete: ${successCount}/${results.length} succeeded`);
  return results;
}
