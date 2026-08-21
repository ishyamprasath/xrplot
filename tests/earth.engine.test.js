import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

describe('EarthEngine GEE fetch', () => {
  it('module loads and exports getEcoMetrics + fetchEcoTimeSeries', async () => {
    const mod = await import('../src/lib/earthEngine.js');
    assert.equal(typeof mod.getEcoMetrics, 'function');
    assert.equal(typeof mod.fetchEcoTimeSeries, 'function');
  });

  it('fallback when no creds: fetchEcoTimeSeries returns SIMULATED_FALLBACK', async () => {
    const origKey = process.env.GEE_SERVICE_ACCOUNT_KEY_JSON;
    const origPriv = process.env.GEE_PRIVATE_KEY;
    delete process.env.GEE_SERVICE_ACCOUNT_KEY_JSON;
    delete process.env.GEE_PRIVATE_KEY;
    const { fetchEcoTimeSeries } = await import('../src/lib/earthEngine.js');
    const res = await fetchEcoTimeSeries(28.61, 77.20, 10);
    assert.equal(res.source, 'SIMULATED_FALLBACK');
    assert.equal(res.fallback, true);
    assert.ok(res.error.includes('GEE credentials missing') || res.error.includes('GEE'));
    if (origKey) process.env.GEE_SERVICE_ACCOUNT_KEY_JSON = origKey;
    if (origPriv) process.env.GEE_PRIVATE_KEY = origPriv;
  });

  it('getEcoMetrics returns null on fallback (triggers simulation path)', async () => {
    const origKey = process.env.GEE_SERVICE_ACCOUNT_KEY_JSON;
    delete process.env.GEE_SERVICE_ACCOUNT_KEY_JSON;
    delete process.env.GEE_PRIVATE_KEY;
    const { getEcoMetrics } = await import('../src/lib/earthEngine.js');
    const res = await getEcoMetrics(11.0, 76.9);
    assert.equal(res, null);
    if (origKey) process.env.GEE_SERVICE_ACCOUNT_KEY_JSON = origKey;
  });

  it('simulation still works as GEE fallback — runSimulation produces valid trends', async () => {
    const { runSimulation } = await import('../src/lib/simulationModel.js');
    const s = await runSimulation('FallbackCity', 12.97, 77.59, null, null);
    assert.equal(s.simulationMetadata.modelVersion, '2.0-earth');
    assert.ok(s.ndbiTrend.length === 11 && s.ndviTrend.length === 11 && s.lstTrend.length === 11);
  });
});
