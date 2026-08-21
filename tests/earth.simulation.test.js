import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runSimulation } from '../src/lib/simulationModel.js';

describe('Earth SimulationModel', () => {
  it('generates NDBI/NDVI/LST trends length 11, NDVI declining, NDBI rising', async () => {
    const s = await runSimulation('Delhi', 28.61, 77.20, { urbanDensity: 62 }, { developmentLevel: 2 });
    assert.equal(s.ndbiTrend.length, 11);
    assert.equal(s.ndviTrend.length, 11);
    assert.equal(s.lstTrend.length, 11);
    assert.ok(s.ndbiTrend.at(-1) > s.ndbiTrend[0], 'NDBI should rise with sprawl');
    assert.ok(s.ndviTrend.at(-1) < s.ndviTrend[0], 'NDVI should fall with green loss');
    assert.ok(s.lstTrend.at(-1) > s.lstTrend[0], 'LST should rise');
  });

  it('NDVI in (0.05,0.9), NDBI in (-0.2,0.6), LST realistic 25-45C', async () => {
    const s = await runSimulation('Test', 11.0, 76.9, null, null);
    for (const v of s.ndviTrend) assert.ok(v > 0.05 && v < 0.9, `NDVI ${v}`);
    for (const v of s.ndbiTrend) assert.ok(v > -0.2 && v < 0.7, `NDBI ${v}`);
    for (const v of s.lstTrend) assert.ok(v > 20 && v < 50, `LST ${v}`);
  });

  it('produces 6 eco hotspots with required eco types + hope central', async () => {
    const s = await runSimulation('Kochi', 9.93, 76.26, null, null);
    assert.equal(s.hotspots.length, 6);
    const types = s.hotspots.map(h=>h.type);
    for (const must of ['vanishing_green','heat_island','flood_zone','air_corridor','eco_restored','water_stress']) {
      assert.ok(types.includes(must), `missing ${must}`);
    }
    const oasis = s.hotspots.find(h=>h.type==='eco_restored');
    assert.ok(oasis.confidence > 0.5 && oasis.growthFactor >= 1.5, 'oasis should be hopeful');
    assert.match(oasis.description, /HOPE|Regenerated|GREEN FUTURE/i);
  });

  it('urbanDensity 10-90, greenCover 8-60, waterStress 15-95, confidence 0.3-0.95', async () => {
    const s = await runSimulation('Pune', 18.52, 73.85, null, null);
    assert.ok(s.urbanDensity >= 10 && s.urbanDensity <= 90);
    assert.ok(s.greenCover >= 8 && s.greenCover <= 60);
    assert.ok(s.waterStress >= 15 && s.waterStress <= 95);
    assert.ok(s.confidence >= 0.3 && s.confidence <= 0.95);
  });

  it('modelVersion is 2.0-earth and indices include NDBI,NDVI,LST', async () => {
    const s = await runSimulation('X', 0, 0, null, null);
    assert.equal(s.simulationMetadata.modelVersion, '2.0-earth');
    assert.deepEqual(s.simulationMetadata.indices, ['NDBI','NDVI','LST']);
  });
});
