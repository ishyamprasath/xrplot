import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { v4 as uuidv4 } from 'uuid';

import { analyzeLocation } from '@/lib/gee';
import { generateUrbanReport, computeNodePositions } from '@/lib/predictionReport';
import { synthesizeScenePanoramas } from '@/lib/predictionSynthesis';

const currentYear = new Date().getFullYear();
const FUTURE_YEAR = currentYear + 10;
const START_YEAR = currentYear - 10;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function buildPastFutureSummary(placeName, report) {
  const loc = placeName || 'this district';
  const past = report?.pastDecade || {};
  const future = report?.futureDecade || {};

  const pastText =
    `${START_YEAR}-${currentYear}: ${loc} shows steady urban expansion with ` +
    `hospitals ${past.hospitals ?? '—'}, schools ${past.schools ?? '—'}, ` +
    `shopping centers ${past.shoppingCenters ?? '—'}, parks ${past.parks ?? '—'} ` +
    `and residential blocks ${past.residentialBlocks ?? '—'}.`;

  const futureTextBase =
    `By ${FUTURE_YEAR}, predictive analysis forecasts for ${loc} project ` +
    `hospitals ${future.hospitals ?? '—'}, schools ${future.schools ?? '—'}, ` +
    `shopping centers ${future.shoppingCenters ?? '—'}, parks ${future.parks ?? '—'} ` +
    `and roads ~${future.roadsKm ?? '—'} km (population ~${future.population ?? '—'}k).`;

  const narrative = report?.summary ? ` ${report.summary}` : '';
  return { past: pastText, future: `${futureTextBase}${narrative}` };
}

function normalizeHotspots(hotspots, placeName) {
  const list = Array.isArray(hotspots) ? hotspots : [];
  const requiredTypes = ['residential', 'healthcare', 'education', 'green_space', 'tech_hub'];

  const mainStreets = list.filter((h) => h?.type === 'main_street');
  const mainA =
    mainStreets[0] || {
      id: 'main_street_0',
      type: 'main_street',
      name: `Central Transit Street (${placeName || FUTURE_YEAR})`,
      description: `A pedestrian-friendly main commercial corridor with smart storefronts and transit guidance in ${FUTURE_YEAR}.`,
      confidence: 0.75,
      growthFactor: 2.4,
    };

  const mainB =
    mainStreets[1] || {
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
      description: `A predicted ${t.replace('_', ' ')} zone in ${FUTURE_YEAR} built from the last decade’s satellite trends.`,
      confidence: 0.66,
      growthFactor: 2.0,
    };
  });

  return [mainA, mainB, ...other].slice(0, 7);
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const worldId = body?.worldId;
    const placeName = body?.placeName;

    if (!worldId) {
      return NextResponse.json({ error: 'Missing worldId' }, { status: 400 });
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    // 1) GEE (or deterministic fallback)
    const geeResult = await analyzeLocation(lat, lng);
    if (!geeResult) return NextResponse.json({ error: 'GEE analysis failed' }, { status: 500 });

    const { ndbiTrend, urbanDensity, confidence, geojsonHotspots } = geeResult;

    // 2) Gemini report (or fallback) to drive the city graph
    const report = await generateUrbanReport(lat, lng, ndbiTrend, urbanDensity, placeName);
    const summary = buildPastFutureSummary(placeName, report);

    // 3) Normalize hotspots => predictable set of nodes (2 streets + other districts)
    const normalizedHotspots = normalizeHotspots(report?.hotspots, placeName);

    // 4) Gemini NanoBanana synthesize (fail-safe in predictionSynthesis.js)
    const panoResults = await synthesizeScenePanoramas({
      lat,
      lng,
      urbanDensity,
      confidence,
      ndbiTrend,
      locationName: placeName,
      hotspots: normalizedHotspots,
    });

    const panoByHotspotId = new Map((panoResults || []).map((r) => [r.hotspotId, r]));

    // 5) Convert hotspot positions into ReactFlow coordinates
    const hotspotPositions = computeNodePositions(normalizedHotspots, lat, lng);
    const earthRadius = 111320; // meters per degree lat at equator
    const centerLatRad = lat * Math.PI / 180;
    const baseOffsetX = 500;
    const baseOffsetY = 350;
    const pxDivisor = 1.6;

    const predictedNodes = normalizedHotspots.map((hotspot, i) => {
      const pos = hotspotPositions[i] || { lat, lng };

      const dxMeters = (pos.lng - lng) * earthRadius * Math.cos(centerLatRad);
      const dyMeters = (pos.lat - lat) * earthRadius;

      const x = baseOffsetX + dxMeters / pxDivisor;
      const y = baseOffsetY - dyMeters / pxDivisor;

      const pano = panoByHotspotId.get(hotspot.id) || {};
      const generated = !!pano.generated;

      const growthFactor = typeof hotspot.growthFactor === 'number' ? hotspot.growthFactor : 1;
      const urbanDensityForNode = clamp(Math.round((urbanDensity ?? 45) * clamp(growthFactor / 2, 0.6, 1.8)), 0, 100);
      const predictionConfidenceForNode = clamp(hotspot?.confidence ?? confidence ?? 0.7, 0, 1);

      return {
        id: uuidv4(),
        label: `${FUTURE_YEAR}: ${hotspot.name || hotspot.type}`,
        position: { x, y },
        images: [],
        panoramaUrl: generated ? (pano.url || '') : '',
        panoramaPublicId: generated ? (pano.publicId || '') : '',
        originalPanoramaUrl: '',
        originalPanoramaPublicId: '',
        status: generated ? 'ready' : 'empty',

        // Decade 2.0 predictive fields
        latitude: pos.lat,
        longitude: pos.lng,
        predictionYear: FUTURE_YEAR,
        urbanDensity: urbanDensityForNode,
        predictionConfidence: predictionConfidenceForNode,
        isPredictionNode: true,
        predictionType: hotspot.type,
        geojsonHotspots: i === 0 ? (geojsonHotspots || null) : null,
        ndbiTrend: ndbiTrend || [],
      };
    });

    // 6) Create a connected "city graph": streets => districts => internal links
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

    // Internal connections (roads between “places”)
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

    // 7) Persist as a brand-new predicted world (do not mutate the source world)
    const cityName = (placeName || 'Unknown').split(',')[0].trim().replace(/\s+/g, '_');
    const baseName = `${cityName}_Prediction`;
    const description = `Decade 2.0 predicted world generated from ${placeName || 'selected zone'} at (${lat.toFixed(4)}, ${lng.toFixed(4)}) on ${new Date().toLocaleDateString()}.`;

    const predictedWorld = await World.create({
      userId,
      name: baseName,
      description,
      isPredictionWorld: true,
      nodes: predictedNodes,
      edges: predictedEdges,
    });

    return NextResponse.json({
      success: true,
      confidence,
      summary,
      nodesAdded: predictedNodes.length,
      predictedWorldId: String(predictedWorld._id),
    });
  } catch (error) {
    console.error('POST /api/prediction/analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
