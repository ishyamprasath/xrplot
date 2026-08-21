import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Earth PredictionSynthesis prompts', () => {
  it('SCENE_PROMPTS cover all 6 eco types + legacy fallbacks', async () => {
    const mod = await import('../src/lib/predictionSynthesis.js');
    assert.equal(typeof mod.synthesizeScenePanoramas, 'function');
    assert.equal(typeof mod.synthesize2036Panorama, 'function');
  });

  it('predictionSynthesis file contains eco prompt keywords (dystopia, Miyawaki, cool roofs)', async () => {
    const fs = await import('node:fs');
    const txt = fs.readFileSync('src/lib/predictionSynthesis.js', 'utf8');
    assert.match(txt, /vanishing_green/);
    assert.match(txt, /heat_island/);
    assert.match(txt, /eco_restored/);
    assert.match(txt, /DYSTOPIA|dystopia/);
    assert.match(txt, /Miyawaki/);
    assert.match(txt, /cool.roof|Cool.roof/i);
    assert.match(txt, /earth-2036/);
    assert.ok(!txt.includes('shopping avenue') || txt.includes('HEAT ISLAND'), 'old shopping prompt should be replaced');
  });

  it('cloudinary folder is earth-2036 (not xrplot/predictions)', async () => {
    const fs = await import('node:fs');
    const txt = fs.readFileSync('src/lib/predictionSynthesis.js', 'utf8');
    assert.match(txt, /xrplot\/earth-2036/);
  });
});
