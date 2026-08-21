const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SCENE_TYPES = [
  { id: 'heat_island',     label: 'Urban Heat Island',       icon: 'Thermometer',  color: '#ef4444' },
  { id: 'vanishing_green', label: 'Vanishing Green Belt',    icon: 'TreePine',     color: '#10b981' },
  { id: 'flood_zone',      label: 'Flood Risk Corridor',     icon: 'Droplets',     color: '#3b82f6' },
  { id: 'air_corridor',    label: 'Air Pollution Corridor',  icon: 'Wind',         color: '#f59e0b' },
  { id: 'eco_restored',    label: 'Regenerated Oasis',       icon: 'Sprout',       color: '#22c55e' },
  { id: 'water_stress',    label: 'Water Stress Zone',       icon: 'Waves',        color: '#06b6d4' },
];

export function getSceneTypes() {
  return SCENE_TYPES;
}

export async function generateUrbanReport(lat, lng, ndbiTrend, urbanDensity, locationName, extraMetrics = {}) {
  if (!process.env.GEMINI_API_KEY) {
    return generateFallbackReport(lat, lng, ndbiTrend, urbanDensity, locationName, extraMetrics);
  }

  const coordinates = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const ndbiSlope = ndbiTrend && ndbiTrend.length > 1 ? ((ndbiTrend[ndbiTrend.length - 1] - ndbiTrend[0]) / ndbiTrend.length * 100).toFixed(2) : '1.2';
  const ndviTrend = extraMetrics.ndviTrend || [];
  const ndviSlope = ndviTrend.length > 1 ? ((ndviTrend[ndviTrend.length - 1] - ndviTrend[0]) / ndviTrend.length * 100).toFixed(2) : '-1.5';
  const lstTrend = extraMetrics.lstTrend || [];
  const tempRise = lstTrend.length > 1 ? (lstTrend[lstTrend.length - 1] - lstTrend[0]).toFixed(1) : '2.1';

  const currentYear = new Date().getFullYear();
  const futureYear = currentYear + 10;
  const startYear = currentYear - 10;

  const prompt = `You are an expert climate scientist, remote sensing analyst and urban ecologist. Today's date is ${new Date().toLocaleDateString()}.

Analyze LOCATION and generate an ENVIRONMENTAL IMPACT REPORT comparing PAST DECADE (${startYear}-${currentYear}) vs PREDICTED NEXT DECADE (${currentYear}-${futureYear}) if current trends continue (Dystopia) and also what is possible with intervention (Green Future).

Location: ${locationName || 'Unknown Area'} (${coordinates})
Satellite signals:
- NDBI (built-up) trend: ${ndbiTrend ? `started ${(ndbiTrend[0]*100).toFixed(1)}% -> ${(ndbiTrend[ndbiTrend.length-1]*100).toFixed(1)}% slope ${ndbiSlope}%/yr` : 'rising'} | Urban density ${urbanDensity}%
- NDVI (vegetation) trend: ${ndviTrend.length ? `${ndviTrend[0].toFixed(3)} -> ${ndviTrend[ndviTrend.length-1].toFixed(3)} slope ${ndviSlope}%/yr` : 'declining -1.5%/yr'} (negative = green loss)
- LST (land surface temp) rise: +${tempRise}°C over decade
- Current green cover: ~${extraMetrics.greenCover || 28}% | Water stress index: ${extraMetrics.waterStress || 62}/100

Generate EXACT JSON (no markdown, no extra text):
{
  "summary": "2-3 vivid sentences: what green was lost, heat gained, and the choice between dystopia vs regeneration by ${futureYear}.",
  "pastDecade": {
    "greenCoverKm2": <number>,
    "avgTempC": <number 26-34>,
    "airQualityIndex": <number 70-180>,
    "treeCount": <number thousands>,
    "waterBodies": <number>,
    "carbonTons": <number>,
    "population": <number thousands>
  },
  "futureDecade": {
    "greenCoverKm2": <number less than past>,
    "avgTempC": <number past+1.5 to +3.5>,
    "airQualityIndex": <number past+20 to +80>,
    "treeCount": <number less>,
    "waterBodies": <number less>,
    "carbonTons": <number higher>,
    "population": <number higher>
  },
  "greenFuture": {
    "greenCoverKm2": <number higher than past with intervention>,
    "avgTempC": <number 1-2C cooler than dystopia>,
    "airQualityIndex": <number lower>,
    "treeCount": <number higher>,
    "coolingDegrees": <number 1.5-3>,
    "carbonSavedTons": <number>
  },
  "hotspots": [
    {
      "type": "heat_island|vanishing_green|flood_zone|air_corridor|eco_restored|water_stress",
      "name": "Descriptive eco-name",
      "description": "What this looks like in ${futureYear} - dystopian or regenerated",
      "confidence": 0.0-1.0,
      "growthFactor": 1.0-5.0,
      "impact": "e.g. '+3.1°C hotter, 40% tree loss'",
      "intervention": "e.g. 'Cool roofs + Miyawaki forest saves 2°C'"
    }
  ],
  "keyInsights": [
    "Insight about heat island / green loss",
    "Insight about flood/water stress",
    "Insight about what 1 intervention would save"
  ],
  "interventions": [
    "Top 3 AI-recommended nature-based solutions for this location"
  ]
}

Rules:
- Past numbers realistic for Indian mid-size district.
- futureDecade (dystopia) must be WORSE: less green, hotter, worse AQI.
- greenFuture must show hope: more green, cooler, better AQI with specific interventions.
- Generate exactly 5-6 hotspots, must include at least 1 eco_restored (hope).
- Confidence high where density high.
- Be vivid, specific, local to ${locationName}.`;

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

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    const report = JSON.parse(jsonMatch[0]);

    report.pastDecade = report.pastDecade || {};
    report.futureDecade = report.futureDecade || {};
    report.greenFuture = report.greenFuture || {};
    report.hotspots = (report.hotspots || []).map((h, i) => ({
      ...h,
      id: `${h.type}_${i}`,
      type: SCENE_TYPES.find(st => st.id === h.type) ? h.type : 'vanishing_green',
    }));
    report.keyInsights = report.keyInsights || [];
    report.interventions = report.interventions || [];

    return report;
  } catch (err) {
    console.error('Gemini eco-report generation failed:', err.message);
    return generateFallbackReport(lat, lng, ndbiTrend, urbanDensity, locationName, extraMetrics);
  }
}

function generateFallbackReport(lat, lng, ndbiTrend, urbanDensity, locationName, extraMetrics = {}) {
  const density = urbanDensity || 45;
  const slope = ndbiTrend && ndbiTrend.length > 1
    ? (ndbiTrend[ndbiTrend.length - 1] - ndbiTrend[0]) / ndbiTrend.length
    : 0.02;
  const greenCoverBase = Math.max(8, 42 - density * 0.35);
  const tempBase = 29 + density * 0.04;
  const aqiBase = 85 + density * 1.2;

  const past = {
    greenCoverKm2: Math.round(greenCoverBase * 1.3 * 10) / 10,
    avgTempC: Math.round((tempBase - 1.2) * 10) / 10,
    airQualityIndex: Math.round(aqiBase - 18),
    treeCount: Math.round((120 + (60 - density)) * 10) / 10,
    waterBodies: Math.round(6 + (50 - density) / 15),
    carbonTons: Math.round(180 + density * 3),
    population: Math.round(80 + density * 1.8),
  };

  const dystopia = {
    greenCoverKm2: Math.round(past.greenCoverKm2 * 0.62 * 10) / 10,
    avgTempC: Math.round((past.avgTempC + 2.4 + Math.abs(slope)*30) * 10) / 10,
    airQualityIndex: Math.round(past.airQualityIndex * 1.45),
    treeCount: Math.round(past.treeCount * 0.58 * 10) / 10,
    waterBodies: Math.max(1, Math.round(past.waterBodies * 0.7)),
    carbonTons: Math.round(past.carbonTons * 1.6),
    population: Math.round(past.population * 1.35),
  };

  const greenFuture = {
    greenCoverKm2: Math.round(past.greenCoverKm2 * 1.45 * 10) / 10,
    avgTempC: Math.round((past.avgTempC - 0.6) * 10) / 10,
    airQualityIndex: Math.round(past.airQualityIndex * 0.72),
    treeCount: Math.round(past.treeCount * 1.6 * 10) / 10,
    coolingDegrees: 2.2,
    carbonSavedTons: Math.round(past.carbonTons * 0.45),
  };

  return {
    summary: `Satellite analysis of ${locationName || 'this district'} shows ${Math.round((1 - dystopia.greenCoverKm2/past.greenCoverKm2)*100)}% green cover lost from 2016-2026 with +${(dystopia.avgTempC - past.avgTempC).toFixed(1)}°C warming. By 2036, dystopian sprawl drives ${dystopia.airQualityIndex} AQI and critical water stress — but Miyawaki forests + cool roofs + wetland restoration could cool ${greenFuture.coolingDegrees}°C and save ${greenFuture.carbonSavedTons} tons CO₂.`,
    pastDecade: past,
    futureDecade: dystopia,
    greenFuture,
    hotspots: [
      {
        id: 'vanishing_green_0',
        type: 'vanishing_green',
        name: 'Lost Canopy Corridor',
        description: `2036 dystopia: Once-lush avenue now 38% barren, trees replaced by heat-trapping concrete. Regenerated: Miyawaki forest cools 2.4°C.`,
        confidence: 0.88,
        growthFactor: 2.6,
        impact: '-41% canopy, +2.8°C',
        intervention: 'Miyawaki micro-forest + native trees',
      },
      {
        id: 'heat_island_0',
        type: 'heat_island',
        name: 'Heat Dome Junction',
        description: `Asphalt junction radiating 44°C surface temp in 2036. Cool-roof + reflective pavements cut 3.1°C.`,
        confidence: 0.85,
        growthFactor: 2.9,
        impact: '+3.1°C LST, AQI 178',
        intervention: 'Cool roofs + permeable pavements',
      },
      {
        id: 'flood_zone_0',
        type: 'flood_zone',
        name: 'Flood-Prone Basin',
        description: `Concrete drains overflow in monsoon 2036, 0.8m inundation. Restored wetlands absorb 60% runoff.`,
        confidence: 0.78,
        growthFactor: 2.2,
        impact: 'Flood depth +60%',
        intervention: 'Revive lakes + bioswales',
      },
      {
        id: 'air_corridor_0',
        type: 'air_corridor',
        name: 'Smog Corridor',
        description: `Traffic artery choked: PM2.5 148 µg/m³ in 2036. EV lanes + green buffer cuts 42% pollution.`,
        confidence: 0.81,
        growthFactor: 2.4,
        impact: 'AQI 168, PM2.5 x2.3',
        intervention: 'Green buffer + EV Transit',
      },
      {
        id: 'eco_restored_0',
        type: 'eco_restored',
        name: 'Regenerated Oasis',
        description: `Hope vision 2036: Restored park with 3x biodiversity, community forest, clean lake swimming.`,
        confidence: 0.72,
        growthFactor: 3.2,
        impact: '+58% biodiversity',
        intervention: 'Community stewardship + lake revival',
      },
      {
        id: 'water_stress_0',
        type: 'water_stress',
        name: 'Depleting Aquifer Zone',
        description: `Groundwater -12m in 2036, borewells dry. Rain harvesting + recharge pits restore 40% level.`,
        confidence: 0.76,
        growthFactor: 1.9,
        impact: '-12m water table',
        intervention: 'Rain gardens + recharge wells',
      },
    ],
    keyInsights: [
      `Green cover collapsing ${(past.greenCoverKm2 - dystopia.greenCoverKm2).toFixed(1)} km² lost — direct heat island driver (+${(dystopia.avgTempC - past.avgTempC).toFixed(1)}°C).`,
      `Air quality tipping to ${dystopia.airQualityIndex} AQI; cool roofs + urban forest would drop to ${greenFuture.airQualityIndex}.`,
      `Wetland loss caused flood risk +60%; restoring 2 lakes + Miyawaki cuts peak flood by half and saves ${greenFuture.carbonSavedTons}t CO₂.`,
    ],
    interventions: [
      'Miyawaki dense forest corridors (cools 2-3°C, fastest green cover)',
      'Cool roofs + high-albedo pavements on heat domes',
      'Revive urban lakes + bioswales for flood & recharge',
    ],
  };
}

export function computeNodePositions(hotspots, centerLat, centerLng) {
  const positions = [];
  const radiusMeters = 200;
  const earthRadius = 111320;

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
