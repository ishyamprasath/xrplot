export async function runSimulation(placeName, lat, lng, locationInsights, gdpInsights) {
  const currentYear = new Date().getFullYear();
  const years = 10;
  const ndbiTrend = [];
  const ndviTrend = [];
  const lstTrend = [];

  let baseNdbi = 0.3 + Math.random() * 0.2;
  for (let i = 0; i <= years; i++) {
    ndbiTrend.push(baseNdbi + (i * 0.018) + (Math.random() * 0.04 - 0.02));
  }

  let baseNdvi = 0.52 + Math.random() * 0.12;
  for (let i = 0; i <= years; i++) {
    ndviTrend.push(Math.max(0.12, baseNdvi - (i * 0.022) + (Math.random() * 0.03 - 0.015)));
  }

  let baseLst = 29.5 + Math.random() * 2.5;
  for (let i = 0; i <= years; i++) {
    lstTrend.push(baseLst + (i * 0.24) + (Math.random() * 0.6 - 0.3));
  }

  let urbanDensity = 45;
  if (locationInsights?.urbanDensity) {
    urbanDensity = locationInsights.urbanDensity;
  } else if (gdpInsights?.developmentLevel) {
    urbanDensity = 30 + gdpInsights.developmentLevel * 15;
  }
  urbanDensity = Math.max(10, Math.min(90, urbanDensity + (Math.random() * 20 - 10)));

  let confidence = 0.78;
  if (locationInsights?.dataQuality) {
    confidence = locationInsights.dataQuality;
  }
  confidence = Math.max(0.3, Math.min(0.95, confidence + (Math.random() * 0.2 - 0.1)));

  const greenCover = Math.max(8, Math.round(48 - urbanDensity * 0.42 + (Math.random()*6-3)));
  const waterStress = Math.min(95, Math.max(15, Math.round(38 + urbanDensity * 0.55 + (Math.random()*10-5))));

  const hotspots = [
    {
      id: 'vanishing_green_0',
      type: 'vanishing_green',
      name: `Canopy Loss Corridor (${placeName || 'Zone'})`,
      description: `Dystopian 2036: Once-green avenue now barren, canopy -41%. Regenerated: Miyawaki forest cools 2.4°C.`,
      confidence: confidence * 0.92,
      growthFactor: 2.6,
      impact: '-41% canopy, +2.8°C',
      intervention: 'Miyawaki micro-forest',
    },
    {
      id: 'heat_island_0',
      type: 'heat_island',
      name: `Heat Dome Junction`,
      description: `44°C surface island in 2036. Cool-roof retrofit cuts 3.1°C peak temp.`,
      confidence: confidence * 0.9,
      growthFactor: 2.9,
      impact: '+3.1°C LST',
      intervention: 'Cool roofs + albedo pavements',
    },
    {
      id: 'flood_zone_0',
      type: 'flood_zone',
      name: `Flood-Prone Basin`,
      description: `Monsoon 2036: 0.8m inundation as wetlands lost. Restored ponds absorb 60% runoff.`,
      confidence: confidence * 0.82,
      growthFactor: 2.2,
      impact: 'Flood +60%',
      intervention: 'Lake revival + bioswales',
    },
    {
      id: 'air_corridor_0',
      type: 'air_corridor',
      name: `Smog Corridor`,
      description: `AQI 168 in 2036, PM2.5 doubled. Green buffer + EV lanes cut 42% emissions.`,
      confidence: confidence * 0.85,
      growthFactor: 2.4,
      impact: 'AQI 168',
      intervention: 'Green buffer + clean transit',
    },
    {
      id: 'eco_restored_0',
      type: 'eco_restored',
      name: `Regenerated Oasis (HOPE)`,
      description: `GREEN FUTURE 2036: Restored park, 3x biodiversity, cool lake, community forest — proof regeneration works.`,
      confidence: confidence * 0.75,
      growthFactor: 3.2,
      impact: '+58% biodiversity',
      intervention: 'Community forest + lake',
    },
    {
      id: 'water_stress_0',
      type: 'water_stress',
      name: `Depleting Aquifer Zone`,
      description: `Groundwater -12m, borewells dry in 2036. Rain gardens recharge 40% level.`,
      confidence: confidence * 0.78,
      growthFactor: 1.9,
      impact: '-12m water table',
      intervention: 'Recharge pits + rain harvesting',
    }
  ];

  return {
    urbanDensity: Math.round(urbanDensity),
    confidence: Math.round(confidence * 100) / 100,
    ndbiTrend,
    ndviTrend,
    lstTrend,
    greenCover,
    waterStress,
    hotspots,
    simulationMetadata: {
      placeName,
      coordinates: { lat, lng },
      generatedAt: new Date().toISOString(),
      modelVersion: '2.0-earth',
      indices: ['NDBI', 'NDVI', 'LST']
    }
  };
}
