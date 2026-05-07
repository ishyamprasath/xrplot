import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { v4 as uuidv4 } from 'uuid';
import { generateComprehensiveAnalysis, generateFutureProjectionPrompt } from '@/lib/gemini';
import { runSimulation } from '@/lib/simulationModel';
import { synthesizeScenePanoramas } from '@/lib/predictionSynthesis';

const currentYear = new Date().getFullYear();
const FUTURE_YEAR = currentYear + 10;
const START_YEAR = currentYear - 10;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function buildPastFutureSummary(placeName, report) {
  const loc = placeName || 'this district';
  const past = report?.pastDecade || {};
  const future = report?.futureDecade || {};
  const pastText = `${START_YEAR}-${currentYear}: ${loc} shows steady urban expansion with ` +
    `hospitals ${past.hospitals ?? '—'}, schools ${past.schools ?? '—'}, ` +
    `shopping centers ${past.shoppingCenters ?? '—'}, parks ${past.parks ?? '—'} ` +
    `and residential blocks ${past.residentialBlocks ?? '—'}.`;
  const futureTextBase = `By ${FUTURE_YEAR}, predictive analysis forecasts for ${loc} project ` +
    `hospitals ${future.hospitals ?? '—'}, schools ${future.schools ?? '—'}, ` +
    `shopping centers ${future.shoppingCenters ?? '—'}, parks ${future.parks ?? '—'} ` +
    `and roads ~${future.roadsKm ?? '—'} km (population ~${future.population ?? '—'}k).`;
  const narrative = report?.summary ? ` ${report.summary}` : '';
  return { past: pastText, future: `${futureTextBase}${narrative}` };
}

function createNormalizedHotspots(hotspots, placeName) {
  const list = Array.isArray(hotspots) ? hotspots : [];
  const requiredTypes = ['residential', 'healthcare', 'education', 'green_space', 'tech_hub'];
  const mainStreets = list.filter((h) => h?.type === 'main_street');
  const mainA = mainStreets[0] || {
    id: 'main_street_0',
    type: 'main_street',
    name: `Central Transit Street (${placeName || FUTURE_YEAR})`,
    description: `A pedestrian-friendly main commercial corridor with smart storefronts and transit guidance in ${FUTURE_YEAR}.`,
    confidence: 0.75,
    growthFactor: 2.4,
  };
  const mainB = mainStreets[1] || {
    ...mainA,
    id: 'main_street_1',
    name: `Secondary Market Connector (${placeName || FUTURE_YEAR})`,
    description: `A connected secondary street spine linking districts to the main mobility artery in ${FUTURE_YEAR}.`,
    confidence: clamp((mainA.confidence ?? 0.75) - 0.05, 0.4, 0.97),
    growthFactor: clamp((mainA.growthFactor ?? 2.4) * 0.9, 1, 5),
  };
  const byType = new Map(list.map((h) => [h.type, h]));
  const other = requiredTypes.map((t, i) => {
    const existing = byType.get(t);
    if (existing) return existing;
    const fallbackNames = {
      residential: `Skyline Residences`,
      healthcare: `Metro Healthcare Campus`,
      education: `Future Learning Academy`,
      green_space: `Eco-Park Central`,
      tech_hub: `Innovation District`,
    };
    return {
      id: `${t}_${i}`,
      type: t,
      name: `${fallbackNames[t] || t} (${placeName || FUTURE_YEAR})`,
      description: `A predicted ${t.replace('_', ' ')} zone in ${FUTURE_YEAR} built from the last decade's satellite trends.`,
      confidence: 0.66,
      growthFactor: 2.0,
    };
  });
  return [mainA, mainB, ...other].slice(0, 7);
}

function computeNodePositions(normalizedHotspots, lat, lng) {
  const baseOffsetX = 500;
  const baseOffsetY = 350;
  const count = Array.isArray(normalizedHotspots) ? normalizedHotspots.length : 0;
  
  console.log('[API] computeNodePositions called with', count, 'hotspots');
  
  // Arrange nodes in a circle around center
  const nodes = normalizedHotspots.map((hotspot, i) => {
    const angle = (i / Math.max(count, 1)) * 2 * Math.PI;
    const radius = 200;
    let x = baseOffsetX + Math.cos(angle) * radius;
    let y = baseOffsetY + Math.sin(angle) * radius;
    
    // Defensive: ensure valid numbers
    if (!Number.isFinite(x)) x = baseOffsetX + i * 100;
    if (!Number.isFinite(y)) y = baseOffsetY + ((i % 2) * 100);
    
    return {
      id: uuidv4(),
      label: `${FUTURE_YEAR}: ${hotspot?.name || hotspot?.type || 'Unknown'}`,
      position: { x: Math.round(x), y: Math.round(y) },
      images: [],
      panoramaUrl: '',
      panoramaPublicId: '',
      originalPanoramaUrl: '',
      originalPanoramaPublicId: '',
      status: 'empty',
      predictionYear: FUTURE_YEAR,
      urbanDensity: 45,
      predictionConfidence: 0.7,
      isPredictionNode: true,
      predictionType: hotspot?.type || 'unknown',
      geojsonHotspots: null,
      ndbiTrend: [],
    };
  });
  
  console.log('[API] Generated', nodes.length, 'nodes. Positions:', nodes.map(n => ({x: n.position.x, y: n.position.y})));
  return nodes;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lat, lng, placeName, worldId } = await req.json();
    
    // Validate JSON parsing and request format
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof placeName !== 'string') {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    await connectDB();

    // 1) Generate comprehensive analysis using Gemini 3 Flash Preview
    console.log('[API] Step 1: Starting Gemini analysis...');
    const analysis = await generateComprehensiveAnalysis(placeName, lat, lng);
    if (!analysis.success) {
      console.error('[API] Step 1 FAILED:', analysis.error);
      return NextResponse.json({ error: 'Analysis failed', details: analysis.error }, { status: 500 });
    }
    console.log('[API] Step 1: Analysis complete');

    // Extract insights for simulation
    const gdpInsights = analysis.gdpInsights;
    const locationInsights = analysis.locationInsights;

    // 2) Run simulation model using Gemini insights
    console.log('[API] Step 2: Running simulation...');
    const simulation = await runSimulation(placeName, lat, lng, locationInsights, gdpInsights);
    console.log('[API] Step 2: Simulation complete');
    
    // Extract simulation results for compatibility
    const urbanDensity = simulation.urbanDensity;
    const confidence = simulation.confidence;
    const ndbiTrend = simulation.ndbiTrend;
    const geojsonHotspots = null;

    // 3) Use simulation-generated hotspots
    console.log('[API] Step 3: Normalizing hotspots...');
    const simulationHotspots = simulation.hotspots || [];

    // 4) Normalize hotspots => predictable set of nodes (2 streets + other districts)
    const normalizedHotspots = createNormalizedHotspots(simulationHotspots, placeName);
    console.log('[API] Step 4: Hotspots normalized, count:', normalizedHotspots.length);

    // 5) Generate panoramic images using simulation results
    console.log('[API] Step 5: Starting image generation...');
    let panoResults;
    try {
      panoResults = await synthesizeScenePanoramas({
        lat,
        lng,
        urbanDensity,
        confidence,
        ndbiTrend,
        locationName: placeName,
        hotspots: normalizedHotspots,
      });
      console.log('[API] Step 5: Image generation complete, count:', panoResults?.length);
    } catch (imgErr) {
      console.error('[API] Step 5 FAILED:', imgErr.message);
      // Continue without images - set empty results
      panoResults = normalizedHotspots.map(h => ({
        hotspotId: h.id,
        type: h.type,
        url: '',
        publicId: '',
        generated: false,
        error: imgErr.message
      }));
    }

    const panoByHotspotId = new Map((panoResults || []).map((r) => [r.hotspotId, r]));

    // 6) Generate nodes with positions and update with panorama data
    let predictedNodes = computeNodePositions(normalizedHotspots, lat, lng);
    
    // Update nodes with actual data from simulation and panoramas
    predictedNodes = predictedNodes.map((node, i) => {
      const hotspot = normalizedHotspots[i];
      const pano = panoByHotspotId.get(hotspot.id) || {};
      const generated = !!pano.generated;
      const growthFactor = typeof hotspot.growthFactor === 'number' && !isNaN(hotspot.growthFactor) ? hotspot.growthFactor : 1;
      const baseDensity = typeof urbanDensity === 'number' && !isNaN(urbanDensity) ? urbanDensity : 45;
      const urbanDensityForNode = clamp(Math.round(baseDensity * clamp(growthFactor / 2, 0.6, 1.8)), 0, 100);
      const baseConfidence = typeof hotspot?.confidence === 'number' && !isNaN(hotspot.confidence) ? hotspot.confidence : 
                             (typeof confidence === 'number' && !isNaN(confidence) ? confidence : 0.7);
      const predictionConfidenceForNode = clamp(baseConfidence, 0, 1);

      return {
        ...node,
        panoramaUrl: generated ? (pano.url || '') : '',
        panoramaPublicId: generated ? (pano.publicId || '') : '',
        status: generated ? 'ready' : 'empty',
        urbanDensity: urbanDensityForNode,
        predictionConfidence: predictionConfidenceForNode,
        geojsonHotspots: i === 0 ? (geojsonHotspots || null) : null,
        ndbiTrend: ndbiTrend || [],
      };
    });

    // 7) Create a connected "city graph": streets => districts => internal links
    const predictedEdges = [];
    const connect = (a, b) => {
      if (!a || !b || a.id === b.id) return;
      predictedEdges.push({ id: uuidv4(), source: a.id, target: b.id });
    };

    const mainStreetsNodes = predictedNodes.filter((n) => n.predictionType === 'main_street');
    const otherNodes = predictedNodes.filter((n) => n.predictionType !== 'main_street');

    if (mainStreetsNodes.length >= 2) {
      connect(mainStreetsNodes[0], mainStreetsNodes[1]);
    }

    // Attach every district to one of the street spines.
    otherNodes.forEach((node, idx) => {
      const targetStreet = mainStreetsNodes[idx % Math.max(1, mainStreetsNodes.length)] || mainStreetsNodes[0] || predictedNodes[0];
      connect(targetStreet, node);
    });

    // Internal connections (roads between "places")
    const residential = predictedNodes.find((n) => n.predictionType === 'residential');
    const healthcare = predictedNodes.find((n) => n.predictionType === 'healthcare');
    const education = predictedNodes.find((n) => n.predictionType === 'education');
    const greenSpace = predictedNodes.find((n) => n.predictionType === 'green_space');
    const techHub = predictedNodes.find((n) => n.predictionType === 'tech_hub');

    connect(residential, healthcare);
    connect(residential, techHub);
    connect(healthcare, education);
    connect(greenSpace, residential);
    connect(techHub, education);

    // 8) Persist as a brand-new predicted world (do not mutate the source world)
    const cityName = (placeName || 'Unknown').split(',')[0].trim().replace(/\s+/g, '_');
    const baseName = `${cityName}_Prediction`;
    const description = `Decade 2.0 predicted world generated from ${placeName || 'selected zone'} at (${lat.toFixed(4)}, ${lng.toFixed(4)}) on ${new Date().toLocaleDateString()}.`;

    // Validate nodes before saving - ensure ALL numeric fields are valid
    console.log('[API] Validating', predictedNodes.length, 'nodes before save...');
    const validatedNodes = predictedNodes.map((n, idx) => {
      let x = n?.position?.x;
      let y = n?.position?.y;
      
      // Defensive: fix any invalid positions
      if (typeof x !== 'number' || !Number.isFinite(x)) {
        console.error(`[API] Node ${idx} has invalid x:`, x, '- using fallback');
        x = 500 + (idx * 100);
      }
      if (typeof y !== 'number' || !Number.isFinite(y)) {
        console.error(`[API] Node ${idx} has invalid y:`, y, '- using fallback');
        y = 350 + ((idx % 2) * 100);
      }
      
      const urbanDensity = typeof n?.urbanDensity === 'number' && !isNaN(n.urbanDensity) ? n.urbanDensity : 45;
      const predictionConfidence = typeof n?.predictionConfidence === 'number' && !isNaN(n.predictionConfidence) ? n.predictionConfidence : 0.7;
      
      // Build clean node object matching schema exactly
      return {
        id: n.id || uuidv4(),
        label: n.label || `${FUTURE_YEAR}: Node ${idx}`,
        position: { x: Math.round(x), y: Math.round(y) },
        images: Array.isArray(n.images) ? n.images : [],
        panoramaUrl: n.panoramaUrl || '',
        panoramaPublicId: n.panoramaPublicId || '',
        originalPanoramaUrl: n.originalPanoramaUrl || '',
        originalPanoramaPublicId: n.originalPanoramaPublicId || '',
        status: n.status || 'empty',
        predictionYear: n.predictionYear || FUTURE_YEAR,
        urbanDensity,
        predictionConfidence,
        isPredictionNode: true,
        predictionType: n.predictionType || 'unknown',
        geojsonHotspots: n.geojsonHotspots || null,
        ndbiTrend: Array.isArray(n.ndbiTrend) ? n.ndbiTrend : [],
      };
    });
    console.log('[API] Validated nodes positions:', validatedNodes.map(n => ({x: n.position.x, y: n.position.y})));
    
    console.log('[API] Step 8: Saving world with', validatedNodes.length, 'nodes...');
    let predictedWorld;
    try {
      predictedWorld = await World.create({
        userId,
        name: baseName,
        description,
        isPredictionWorld: true,
        nodes: validatedNodes,
        edges: predictedEdges,
      });
      console.log('[API] Step 8: World saved successfully');
    } catch (dbError) {
      console.error('[API] Step 8 FAILED - Database error:', dbError.message);
      console.error('[API] Validation errors:', dbError.errors);
      throw dbError;
    }

    // Build summary in format frontend expects
    const summary = buildPastFutureSummary(placeName, analysis);
    
    return NextResponse.json({
      success: true,
      predictedWorldId: predictedWorld._id,
      nodesAdded: validatedNodes.length,
      confidence: confidence || 0.7,
      summary: {
        past: summary.past || analysis.analysis || 'Historical analysis of urban development over the past decade.',
        future: summary.future || 'Predicted urban growth and infrastructure development for the next decade.'
      },
      world: predictedWorld,
      panoramas: panoResults,
    });
  } catch (error) {
    console.error('POST /api/prediction/analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
