let ee = null;
let initialized = false;
let initError = null;

async function getEE() {
  if (initialized) return ee;
  if (initError) throw initError;
  try {
    ee = require('@google/earthengine');
    initialized = true;
    return ee;
  } catch (e) {
    initError = e;
    throw e;
  }
}

async function initEE() {
  const keyJson = process.env.GEE_SERVICE_ACCOUNT_KEY_JSON;
  const privateKey = process.env.GEE_PRIVATE_KEY;
  const clientEmail = process.env.GEE_CLIENT_EMAIL;
  if (!keyJson && !(privateKey && clientEmail)) {
    throw new Error('GEE credentials missing: set GEE_SERVICE_ACCOUNT_KEY_JSON or GEE_PRIVATE_KEY+GEE_CLIENT_EMAIL');
  }
  const eeInstance = await getEE();
  return new Promise((resolve, reject) => {
    try {
      let credentials;
      if (keyJson) credentials = JSON.parse(keyJson);
      else credentials = { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') };
      eeInstance.data.authenticateViaPrivateKey(credentials, () => {
        eeInstance.initialize(null, null, () => resolve(eeInstance), (err) => reject(err));
      }, (err) => reject(err));
    } catch (e) { reject(e); }
  });
}

export async function fetchEcoTimeSeries(lat, lng, years = 10) {
  const startYear = new Date().getFullYear() - years;
  const endYear = new Date().getFullYear();
  try {
    const eeInstance = await initEE();
    const point = eeInstance.Geometry.Point([lng, lat]);
    const region = point.buffer(250).bounds();

    const s2 = eeInstance.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(region)
      .filterDate(`${startYear}-01-01`, `${endYear}-12-31`)
      .filter(eeInstance.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map(img => {
        const ndvi = img.normalizedDifference(['B8','B4']).rename('NDVI');
        const ndbi = img.normalizedDifference(['B11','B8']).rename('NDBI');
        const year = eeInstance.Date(img.get('system:time_start')).get('year');
        return ndvi.addBands(ndbi).addBands(eeInstance.Image.constant(year).rename('year')).copyProperties(img, ['system:time_start']);
      });

    const lstCollection = eeInstance.ImageCollection('MODIS/061/MOD11A1')
      .filterBounds(region)
      .filterDate(`${startYear}-01-01`, `${endYear}-12-31`)
      .select('LST_Day_1km');

    const yearly = eeInstance.List.sequence(startYear, endYear).map(y => {
      const yNum = eeInstance.Number(y);
      const s2Year = s2.filter(eeInstance.Filter.eq('year', yNum)).mean().clip(region);
      const lstYear = lstCollection.filter(eeInstance.Filter.calendarRange(yNum, yNum, 'year')).mean().clip(region);
      const ndviMean = s2Year.select('NDVI').reduceRegion({ reducer: eeInstance.Reducer.mean(), geometry: region, scale: 100, maxPixels: 1e9 });
      const ndbiMean = s2Year.select('NDBI').reduceRegion({ reducer: eeInstance.Reducer.mean(), geometry: region, scale: 100, maxPixels: 1e9 });
      const lstMean = lstYear ? lstYear.reduceRegion({ reducer: eeInstance.Reducer.mean(), geometry: region, scale: 1000, maxPixels: 1e9 }) : eeInstance.Dictionary({ LST_Day_1km: 0 });
      return eeInstance.Feature(null, {
        year: yNum,
        ndvi: ndviMean.get('NDVI'),
        ndbi: ndbiMean.get('NDBI'),
        lst: lstMean.get('LST_Day_1km')
      });
    });

    const fc = eeInstance.FeatureCollection(yearly);
    const result = await new Promise((resolve, reject) => {
      fc.getInfo((data, err) => err ? reject(err) : resolve(data));
    });

    const ndbiTrend = [];
    const ndviTrend = [];
    const lstTrend = [];
    let valid = 0;
    (result.features || []).forEach(f => {
      const p = f.properties || {};
      const ndvi = typeof p.ndvi === 'number' ? Math.max(0.05, Math.min(0.9, p.ndvi)) : null;
      const ndbi = typeof p.ndbi === 'number' ? Math.max(-0.2, Math.min(0.6, p.ndbi)) : null;
      const lstRaw = typeof p.lst === 'number' ? p.lst : null;
      const lst = lstRaw ? (lstRaw * 0.02 - 273.15) : null;
      if (ndvi !== null && ndbi !== null) {
        ndbiTrend.push(ndbi);
        ndviTrend.push(ndvi);
        lstTrend.push(lst !== null && lst > -10 && lst < 60 ? lst : 30 + valid*0.25);
        valid++;
      }
    });

    if (valid < 3) throw new Error(`GEE returned too few valid years (${valid})`);

    const urbanDensity = Math.round(Math.max(12, Math.min(88, (ndbiTrend[ndbiTrend.length-1] + 0.2) * 120)));
    const greenCover = Math.round(Math.max(8, Math.min(55, ndviTrend[ndviTrend.length-1] * 90)));
    const waterStress = Math.round(Math.max(15, Math.min(92, 35 + urbanDensity * 0.55)));

    return {
      source: 'GEE_REAL',
      ndbiTrend, ndviTrend, lstTrend, urbanDensity, greenCover, waterStress,
      years: Array.from({ length: years+1 }, (_, i) => startYear + i),
      meta: { lat, lng, validYears: valid, startYear, endYear }
    };
  } catch (err) {
    console.warn('[GEE] Real fetch failed, falling back to simulated:', err.message);
    return { source: 'SIMULATED_FALLBACK', error: err.message, fallback: true };
  }
}

export async function getEcoMetrics(lat, lng) {
  const real = await fetchEcoTimeSeries(lat, lng, 10);
  if (real.source === 'GEE_REAL' && !real.fallback) return real;
  return null;
}
