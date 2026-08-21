import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Earth API route — static checks', () => {
  it('analyze route imports GEE, dual simulation, EarthCharts data', () => {
    const txt = fs.readFileSync('src/app/api/prediction/analyze/route.js', 'utf8');
    assert.match(txt, /getEcoMetrics/);
    assert.match(txt, /geeReal/);
    assert.match(txt, /geeSource/);
    assert.match(txt, /buildEcoSummary/);
    assert.match(txt, /ndviTrend/);
    assert.match(txt, /lstTrend/);
    assert.match(txt, /EARTH LENS 2036/);
    assert.match(txt, /eco_restored/);
  });

  it('route handles both GEE_REAL and SIMULATED with confidence 0.88 vs simulated', () => {
    const txt = fs.readFileSync('src/app/api/prediction/analyze/route.js', 'utf8');
    assert.match(txt, /confidence = geeReal \? 0\.88/);
    assert.match(txt, /urbanDensity = geeReal\?/);
  });

  it('route returns simulation with geeSource and ecoReport', () => {
    const txt = fs.readFileSync('src/app/api/prediction/analyze/route.js', 'utf8');
    assert.match(txt, /simulation: \{ ndbiTrend, ndviTrend, lstTrend/);
    assert.match(txt, /ecoReport/);
    assert.match(txt, /mode: 'earth-2036'/);
  });

  it('World model has eco fields (isPredictionNode, predictionType, ndbiTrend)', () => {
    const txt = fs.readFileSync('src/models/World.js', 'utf8');
    assert.match(txt, /isPredictionNode/);
    assert.match(txt, /predictionType/);
    assert.match(txt, /ndbiTrend/);
  });

  it('agent tools include analyzeEcoImpact + suggestGreenInterventions + earth createDecadePrediction', () => {
    const txt = fs.readFileSync('src/lib/agent-tools.js', 'utf8');
    assert.match(txt, /analyzeEcoImpact/);
    assert.match(txt, /suggestGreenInterventions/);
    assert.match(txt, /EARTH LENS 2036/);
    const txt2 = fs.readFileSync('src/lib/agent.js', 'utf8');
    assert.match(txt2, /TerraPlot Earth Agent/);
    assert.match(txt2, /NDVI\/NDBI\/LST/);
  });
});
