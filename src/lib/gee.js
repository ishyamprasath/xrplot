/**
 * Google Earth Engine (GEE) Satellite Intelligence Module
 * Decade 2.0 — Predictive Urban Growth Analysis
 *
 * Attempts real GEE authentication + NDBI analysis.
 * Falls back to a deterministic, coordinate-seeded simulation
 * so the UI and pipeline work immediately without waiting
 * for Google Cloud project enablement.
 */

import path from 'path';
import { readFileSync, existsSync } from 'fs';

const GEE_PROJECT_ID = process.env.GEE_PROJECT_ID || '';
// Default to the common filename expected by the app.
const SERVICE_ACCOUNT_PATH = process.env.GEE_SERVICE_ACCOUNT_KEY_PATH || path.join(process.cwd(), 'service-account-key.json');

async function getEE() {
  try {
    const mod = await import('@google/earthengine');
    return mod.default || mod;
  } catch {
    return null;
  }
}

/* ─────────────────────── Deterministic Simulation ─────────────────────── */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCoords(lat, lng) {
  let h = 2166136261;
  const str = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function generateSimulatedNDBI(lat, lng) {
  const seed = hashCoords(lat, lng);
  const rng = mulberry32(seed);

  // Base urban density factor (0.15 – 0.65)
  const baseDensity = 0.15 + rng() * 0.5;

  // Growth slope per year (slight upward trend for most locations)
  const slope = 0.005 + rng() * 0.025;

  // Generate 10-year NDBI series (2016 – 2026)
  const ndbiTrend = [];
  for (let year = 0; year < 10; year++) {
    const trend = baseDensity + slope * year;
    const noise = (rng() - 0.5) * 0.06; // ±0.03 noise
    ndbiTrend.push(Math.max(0, Math.min(1, trend + noise)));
  }

  // Linear regression on the 10 points
  const n = ndbiTrend.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += ndbiTrend[i];
    sumXY += i * ndbiTrend[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const regressionSlope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - regressionSlope * sumX) / n;

  // Project to 2036 (year index 20 from 2016 baseline)
  const projectedNDBI = intercept + regressionSlope * 20;
  const clampedProjected = Math.max(0, Math.min(1, projectedNDBI));

  // Urban density as percentage
  const urbanDensity = Math.round(clampedProjected * 100);

  // Confidence based on data quality (simulated: inverse of noise variance)
  const mean = ndbiTrend.reduce((a, b) => a + b, 0) / n;
  const variance = ndbiTrend.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const confidence = Math.max(0.4, Math.min(0.97, 1 - variance * 3));

  // GeoJSON hotspots — small projected growth polygons around the center
  const hotspotCount = Math.floor(rng() * 5) + 2;
  const features = [];
  for (let i = 0; i < hotspotCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 0.001 + rng() * 0.003; // roughly 100–350m
    const cx = lng + Math.cos(angle) * dist;
    const cy = lat + Math.sin(angle) * dist * 0.8; // latitude compression
    const size = 0.0003 + rng() * 0.0005;
    features.push({
      type: 'Feature',
      properties: {
        id: `hotspot-${i + 1}`,
        growthConfidence: parseFloat((0.5 + rng() * 0.45).toFixed(2)),
        estimatedDensityIncrease: parseFloat((rng() * 15 + 5).toFixed(1)),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [cx - size, cy - size],
          [cx + size, cy - size],
          [cx + size, cy + size],
          [cx - size, cy + size],
          [cx - size, cy - size],
        ]],
      },
    });
  }

  const geojsonHotspots = {
    type: 'FeatureCollection',
    features,
  };

  return {
    ndbiTrend: ndbiTrend.map(v => parseFloat(v.toFixed(4))),
    projectedNdbi: parseFloat(clampedProjected.toFixed(4)),
    urbanDensity,
    confidence: parseFloat(confidence.toFixed(3)),
    regressionSlope: parseFloat(regressionSlope.toFixed(6)),
    geojsonHotspots,
    simulated: true,
  };
}

/* ─────────────────────── Real GEE Attempt ─────────────────────── */

async function tryRealGEE(lat, lng) {
  if (!GEE_PROJECT_ID) {
    console.warn('[GEE] Missing GEE_PROJECT_ID; skipping real GEE.');
    return null;
  }
  const ee = await getEE();
  if (!ee) {
    console.warn('[GEE] @google/earthengine not available; skipping real GEE.');
    return null;
  }

  // Attempt service-account auth
  let credentials = null;

  // 1. Try environment variable first (most secure for production)
  if (process.env.GEE_SERVICE_ACCOUNT_KEY) {
    try {
      credentials = JSON.parse(process.env.GEE_SERVICE_ACCOUNT_KEY);
    } catch (err) {
      console.warn('[GEE] Failed to parse GEE_SERVICE_ACCOUNT_KEY env var:', err?.message || err);
    }
  }

  // 2. Try file if env var not available
  if (!credentials) {
    const resolvedKeyPath = path.isAbsolute(SERVICE_ACCOUNT_PATH)
      ? SERVICE_ACCOUNT_PATH
      : path.join(process.cwd(), SERVICE_ACCOUNT_PATH);

    // Fallback for common typo found in workspace
    const altPath = resolvedKeyPath.endsWith('.json') ? resolvedKeyPath + '.json' : resolvedKeyPath;

    const finalPath = existsSync(resolvedKeyPath) ? resolvedKeyPath : (existsSync(altPath) ? altPath : null);

    if (finalPath) {
      try {
        credentials = JSON.parse(readFileSync(finalPath, 'utf8'));
      } catch (err) {
        console.warn('[GEE] Failed to parse service account key JSON:', err?.message || err);
        credentials = null;
      }
    }
  }

  if (!credentials) {
    console.warn('[GEE] Service account key not found (env var GEE_SERVICE_ACCOUNT_KEY or file at):', SERVICE_ACCOUNT_PATH);
    return null;
  }

  // @google/earthengine expects browser globals; skip in Node if not patched.
  if (typeof window === 'undefined' && !ee.data?.authenticateViaPrivateKey) {
    // In Node, we might need to manually set up some ee.data methods or 
    // ensure the library is correctly imported for server-side use.
    // However, recent versions of @google/earthengine should have these.
    console.warn('[GEE] ee.data.authenticateViaPrivateKey not available; attempting to proceed anyway.');
  }

  return new Promise((resolve) => {
    try {
      // Ensure requests are billed/routed to your project.
      if (ee.data?.setProject) {
        ee.data.setProject(GEE_PROJECT_ID);
      }

      const authCallback = () => {
        ee.initialize(
          null,
          null,
          () => {
            console.log('[GEE] Successfully initialized GEE.');
            resolve(runNDBIAnalysis(lat, lng, ee));
          },
          (initErr) => {
            console.warn('[GEE] ee.initialize failed:', initErr?.message || initErr);
            resolve(null);
          }
        );
      };

      const authErrorCallback = (authErr) => {
        console.warn('[GEE] authenticateViaPrivateKey failed:', authErr?.message || authErr);
        resolve(null);
      };

      if (ee.data?.authenticateViaPrivateKey) {
        ee.data.authenticateViaPrivateKey(credentials, authCallback, authErrorCallback);
      } else {
        console.warn('[GEE] No authentication method found on ee.data');
        resolve(null);
      }
    } catch (err) {
      console.warn('[GEE] Unexpected error during auth/init:', err?.message || err);
      resolve(null);
    }
  });
}

async function runNDBIAnalysis(lat, lng, ee) {
  try {
    const point = ee.Geometry.Point([lng, lat]);
    const buffer = point.buffer(250); // 500m diameter zone

    const collection = ee
      .ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(buffer)
      .filterDate('2016-01-01', '2026-05-01')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

    // Yearly median composites
    const years = ee.List.sequence(2016, 2026);
    const yearly = years.map((y) => {
      const start = ee.Date.fromYMD(y, 1, 1);
      const end = start.advance(1, 'year');
      const yearColl = collection.filterDate(start, end);
      const median = yearColl.median();
      // NDBI = (SWIR1 - NIR) / (SWIR1 + NIR)  →  B11 = SWIR, B8 = NIR
      const ndbi = median
        .normalizedDifference(['B11', 'B8'])
        .rename('ndbi');
      return ndbi.set('year', y);
    });

    const yearlyCollection = ee.ImageCollection(yearly);

    // Extract mean NDBI per year over the buffer
    const ndbiTrend = [];
    const yearList = yearlyCollection.toList(yearlyCollection.size());
    const size = yearList.size().getInfo();

    for (let i = 0; i < size; i++) {
      const img = ee.Image(yearList.get(i));
      const mean = img.reduceRegion({ reducer: ee.Reducer.mean(), geometry: buffer, scale: 10, maxPixels: 1e9 });
      const val = mean.get('ndbi').getInfo();
      ndbiTrend.push(val !== null && !isNaN(val) ? parseFloat(val.toFixed(4)) : 0);
    }

    if (ndbiTrend.length === 0 || ndbiTrend.every((v) => v === 0)) {
      throw new Error('No valid satellite data for this location');
    }

    // Linear regression on yearly indices
    const n = ndbiTrend.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += ndbiTrend[i];
      sumXY += i * ndbiTrend[i];
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    const projected = Math.max(-1, Math.min(1, intercept + slope * 20));
    const urbanDensity = Math.round(((projected + 1) / 2) * 100); // map [-1,1] → [0,100]

    // Variance → confidence
    const mean = sumY / n;
    const variance = ndbiTrend.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const confidence = Math.max(0.4, Math.min(0.97, 1 - variance * 3));

    // Hotspots — threshold predicted NDBI layer
    const lastNdbi = ee.Image(yearList.get(n - 1));
    const hotspots = lastNdbi
      .gt(0.1)
      .selfMask()
      .reduceToVectors({ geometry: buffer, scale: 30, maxPixels: 1e9 });

    // Convert hotspots to GeoJSON (simplified)
    const geojson = hotspots.getInfo();

    return {
      ndbiTrend,
      projectedNdbi: parseFloat(projected.toFixed(4)),
      urbanDensity,
      confidence: parseFloat(confidence.toFixed(3)),
      regressionSlope: parseFloat(slope.toFixed(6)),
      geojsonHotspots: geojson,
      simulated: false,
    };
  } catch (err) {
    console.error('GEE analysis error:', err.message);
    return null;
  }
}

/* ─────────────────────── Public API ─────────────────────── */

export async function analyzeLocation(lat, lng) {
  // 1. Try real GEE
  const realResult = await tryRealGEE(lat, lng);
  if (realResult) return realResult;

  // 2. Fallback: deterministic simulation
  console.warn('GEE unavailable or failed — using simulation fallback for', lat, lng);
  return generateSimulatedNDBI(lat, lng);
}

export async function isGEEAvailable() {
  const ee = await getEE();
  return !!ee && !!GEE_PROJECT_ID;
}
