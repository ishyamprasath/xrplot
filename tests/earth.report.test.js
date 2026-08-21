import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSceneTypes, generateUrbanReport } from '../src/lib/predictionReport.js';

describe('Earth PredictionReport', () => {
  it('SCENE_TYPES are eco types (6, includes heat_island, eco_restored)', () => {
    const types = getSceneTypes();
    assert.equal(types.length, 6);
    const ids = types.map(t=>t.id);
    assert.ok(ids.includes('heat_island'));
    assert.ok(ids.includes('vanishing_green'));
    assert.ok(ids.includes('flood_zone'));
    assert.ok(ids.includes('eco_restored'));
    assert.ok(ids.includes('water_stress'));
    assert.ok(!ids.includes('main_street'), 'old urban types removed');
  });

  it('fallback generates dystopia vs greenFuture (worse + hopeful)', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const report = await generateUrbanReport(28.6, 77.2, [0.32,0.45], 62, 'Delhi');
    process.env.GEMINI_API_KEY = origKey;
    assert.ok(report.pastDecade.greenCoverKm2 > report.futureDecade.greenCoverKm2, 'dystopia green < past');
    assert.ok(report.futureDecade.avgTempC > report.pastDecade.avgTempC, 'dystopia hotter');
    assert.ok(report.futureDecade.airQualityIndex > report.pastDecade.airQualityIndex, 'dystopia smoggier');
    assert.ok(report.greenFuture.greenCoverKm2 > report.futureDecade.greenCoverKm2, 'hope greener than dystopia');
    assert.ok(report.greenFuture.avgTempC < report.futureDecade.avgTempC, 'hope cooler');
    assert.ok(report.greenFuture.carbonSavedTons > 0);
  });

  it('fallback hotspots 6 with impact + intervention per hotspot', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const report = await generateUrbanReport(13.0, 80.2, null, 45, 'Chennai', { ndviTrend:[0.5,0.3], lstTrend:[30,33], greenCover:28, waterStress:60 });
    process.env.GEMINI_API_KEY = origKey;
    assert.equal(report.hotspots.length, 6);
    for (const h of report.hotspots) {
      assert.ok(h.impact, `hotspot ${h.type} missing impact`);
      assert.ok(h.intervention, `hotspot ${h.type} missing intervention`);
      assert.ok(h.confidence >= 0 && h.confidence <= 1);
    }
    const oasis = report.hotspots.find(h=>h.type==='eco_restored');
    assert.ok(oasis, 'must include eco_restored hope');
  });

  it('fallback keyInsights 3 + interventions 3 with quantified cooling', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const report = await generateUrbanReport(19.0, 72.8, null, 50, 'Mumbai');
    process.env.GEMINI_API_KEY = origKey;
    assert.ok(report.keyInsights.length >= 3);
    assert.ok(report.interventions.length >= 3);
    assert.match(report.interventions.join(' '), /Miyawaki|Cool roof|wetland|bioswale/i);
  });

  it('computeNodePositions spreads hotspots around center', async () => {
    const { computeNodePositions } = await import('../src/lib/predictionReport.js');
    const hotspots = getSceneTypes().map((t,i)=>({ ...t, name: t.label }));
    const pos = computeNodePositions(hotspots, 28.61, 77.20);
    assert.equal(pos.length, hotspots.length);
    for (const p of pos) {
      assert.ok(Math.abs(p.lat - 28.61) < 0.01);
      assert.ok(Math.abs(p.lng - 77.20) < 0.02);
    }
  });
});
