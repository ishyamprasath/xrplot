/**
 * Urban Development Report Generator
 *
 * Uses Google Gemini AI to synthesize a detailed comparative urban
 * development report for a given coordinate based on NDBI trend data.
 * Produces categorized hotspot nodes (commercial, residential, healthcare,
 * education, green_space, infrastructure) with past-vs-future statistics.
 */

const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SCENE_TYPES = [
  { id: 'main_street',      label: 'Main Commercial Street',    icon: 'Store',      color: '#f59e0b' },
  { id: 'residential',      label: 'Residential District',      icon: 'Home',       color: '#3b82f6' },
  { id: 'healthcare',       label: 'Healthcare Zone',           icon: 'HeartPulse', color: '#ef4444' },
  { id: 'education',        label: 'Education Campus',          icon: 'GraduationCap', color: '#8b5cf6' },
  { id: 'green_space',      label: 'Green Space & Parks',       icon: 'TreePine',   color: '#10b981' },
  { id: 'tech_hub',         label: 'Tech & Business Hub',       icon: 'Cpu',        color: '#06b6d4' },
];

export function getSceneTypes() {
  return SCENE_TYPES;
}

function escapeJson(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export async function generateUrbanReport(lat, lng, ndbiTrend, urbanDensity, locationName) {
  if (!process.env.GEMINI_API_KEY) {
    return generateFallbackReport(lat, lng, ndbiTrend, urbanDensity, locationName);
  }

  const coordinates = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const trendSummary = ndbiTrend
    ? `NDBI trend (10-year): started at ${(ndbiTrend[0] * 100).toFixed(1)}%, ended at ${(ndbiTrend[ndbiTrend.length - 1] * 100).toFixed(1)}%, slope ${((ndbiTrend[ndbiTrend.length - 1] - ndbiTrend[0]) / ndbiTrend.length * 100).toFixed(2)}% per year. Current urban density ${urbanDensity}%.`
    : `Urban density ${urbanDensity}%.`;

  const currentYear = new Date().getFullYear();
  const futureYear = currentYear + 10;
  const startYear = currentYear - 10;

  const prompt = `You are an expert urban planner and satellite intelligence analyst. Today's date is ${new Date().toLocaleDateString()}.

Analyze the following location and generate a detailed URBAN DEVELOPMENT REPORT comparing the PAST DECADE (${startYear}-${currentYear}) with the PREDICTED NEXT DECADE (${currentYear}-${futureYear}).

Location: ${locationName || 'Unknown Area'} (${coordinates})
${trendSummary}

Generate the report in this EXACT JSON format (no markdown, no extra text):

{
  "summary": "A vivid 2-3 sentence narrative describing how this neighborhood has transformed and what it will look like in ${futureYear}.",
  "pastDecade": {
    "hospitals": <number>,
    "schools": <number>,
    "shoppingCenters": <number>,
    "parks": <number>,
    "residentialBlocks": <number>,
    "techOffices": <number>,
    "roadsKm": <number>,
    "population": <number in thousands>
  },
  "futureDecade": {
    "hospitals": <number>,
    "schools": <number>,
    "shoppingCenters": <number>,
    "parks": <number>,
    "residentialBlocks": <number>,
    "techOffices": <number>,
    "roadsKm": <number>,
    "population": <number in thousands>
  },
  "hotspots": [
    {
      "type": "main_street|residential|healthcare|education|green_space|tech_hub",
      "name": "Descriptive name for this area",
      "description": "What this area looks like in ${futureYear}",
      "confidence": 0.0-1.0,
      "growthFactor": 1.0-5.0
    }
  ],
  "keyInsights": [
    "Insight 1 about infrastructure growth",
    "Insight 2 about population changes",
    "Insight 3 about environmental impact"
  ]
}

Rules:
- Numbers must be realistic for a mid-sized urban district (population 50k-500k range).
- Past decade should show moderate growth.
- Future decade should show accelerated growth (1.5x-3x depending on NDBI slope).
- Generate exactly 4-6 hotspots covering different scene types.
- Use vivid, specific descriptions for each hotspot.
- Confidence scores should reflect urban density (higher density = higher confidence).`;

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt,
    });

    let text = '';
    if (result.candidates && result.candidates[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.text) text += part.text;
      }
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    const report = JSON.parse(jsonMatch[0]);

    // Validate and normalize
    report.pastDecade = report.pastDecade || {};
    report.futureDecade = report.futureDecade || {};
    report.hotspots = (report.hotspots || []).map((h, i) => ({
      ...h,
      id: `${h.type}_${i}`,
      type: SCENE_TYPES.find(st => st.id === h.type) ? h.type : 'main_street',
    }));
    report.keyInsights = report.keyInsights || [];

    return report;
  } catch (err) {
    console.error('Gemini report generation failed:', err.message);
    return generateFallbackReport(lat, lng, ndbiTrend, urbanDensity, locationName);
  }
}

function generateFallbackReport(lat, lng, ndbiTrend, urbanDensity, locationName) {
  const density = urbanDensity || 45;
  const slope = ndbiTrend && ndbiTrend.length > 1
    ? (ndbiTrend[ndbiTrend.length - 1] - ndbiTrend[0]) / ndbiTrend.length
    : 0.02;
  const growthMultiplier = 1.3 + Math.abs(slope) * 50;
  const basePop = Math.round(80 + (density * 2));

  const past = {
    hospitals: Math.round(2 + density / 30),
    schools: Math.round(5 + density / 15),
    shoppingCenters: Math.round(3 + density / 20),
    parks: Math.round(4 + density / 25),
    residentialBlocks: Math.round(20 + density / 2),
    techOffices: Math.round(1 + density / 40),
    roadsKm: Math.round(15 + density / 3),
    population: basePop,
  };

  const future = {
    hospitals: Math.round(past.hospitals * growthMultiplier),
    schools: Math.round(past.schools * growthMultiplier * 0.9),
    shoppingCenters: Math.round(past.shoppingCenters * growthMultiplier * 1.2),
    parks: Math.round(past.parks * growthMultiplier * 0.8),
    residentialBlocks: Math.round(past.residentialBlocks * growthMultiplier),
    techOffices: Math.round(past.techOffices * growthMultiplier * 1.5),
    roadsKm: Math.round(past.roadsKm * growthMultiplier * 1.1),
    population: Math.round(basePop * growthMultiplier),
  };

  return {
    summary: `Satellite analysis of ${locationName || 'this district'} reveals steady urban expansion from 2016-2026. By 2036, accelerated construction is projected to transform the area into a dense mixed-use hub with expanded healthcare, education, and commercial corridors.`,
    pastDecade: past,
    futureDecade: future,
    hotspots: [
      {
        id: 'main_street_0',
        type: 'main_street',
        name: 'Central Market Avenue',
        description: `A bustling 2036 commercial street with smart storefronts, drone delivery docks, and pedestrian-only zones lined with AR signage.`,
        confidence: 0.85,
        growthFactor: 2.5,
      },
      {
        id: 'residential_0',
        type: 'residential',
        name: 'Skyline Residences',
        description: `High-density eco-towers with vertical gardens, solar facades, and community rooftops replacing older low-rise blocks.`,
        confidence: 0.78,
        growthFactor: 3.0,
      },
      {
        id: 'healthcare_0',
        type: 'healthcare',
        name: 'Metro General Medical Campus',
        description: `An expanded 2036 hospital complex with AI diagnostics centers, telemedicine hubs, and green healing gardens.`,
        confidence: 0.72,
        growthFactor: 1.8,
      },
      {
        id: 'education_0',
        type: 'education',
        name: 'Future Learning Academy',
        description: `A modern campus blending physical and virtual classrooms, with maker labs, biotech workshops, and open learning plazas.`,
        confidence: 0.68,
        growthFactor: 2.0,
      },
      {
        id: 'green_space_0',
        type: 'green_space',
        name: 'Eco-Park Central',
        description: `A regenerated urban forest with carbon-capture walkways, biodiversity corridors, and community farming plots.`,
        confidence: 0.65,
        growthFactor: 1.5,
      },
      {
        id: 'tech_hub_0',
        type: 'tech_hub',
        name: 'Innovation District',
        description: `Glass-and-steel tech campus housing AI research labs, startup incubators, and autonomous transit terminals.`,
        confidence: 0.70,
        growthFactor: 2.8,
      },
    ],
    keyInsights: [
      `Residential density projected to increase ${Math.round((future.residentialBlocks / past.residentialBlocks - 1) * 100)}% with vertical eco-tower construction.`,
      `Healthcare infrastructure expanding to ${future.hospitals} facilities to serve a population of ${future.population}k residents.`,
      `Commercial corridors transforming into smart pedestrian zones with integrated drone logistics.`,
    ],
  };
}

export function computeNodePositions(hotspots, centerLat, centerLng) {
  // Arrange hotspots in a hexagonal/flower pattern around the center
  const positions = [];
  const radiusMeters = 200;
  const earthRadius = 111320; // meters per degree at equator

  hotspots.forEach((hotspot, i) => {
    const angle = (i / hotspots.length) * 2 * Math.PI - Math.PI / 2;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const dLat = dy / earthRadius;
    const dLng = dx / (earthRadius * Math.cos(centerLat * Math.PI / 180));

    positions.push({
      ...hotspot,
      lat: centerLat + dLat,
      lng: centerLng + dLng,
    });
  });

  return positions;
}
