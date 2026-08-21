import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Earth E2E smoke — file existence + buildability', () => {
  const mustExist = [
    'src/lib/earthEngine.js',
    'src/lib/predictionReport.js',
    'src/lib/simulationModel.js',
    'src/lib/predictionSynthesis.js',
    'src/lib/gemini.js',
    'src/lib/agent.js',
    'src/lib/agent-tools.js',
    'src/app/api/prediction/analyze/route.js',
    'src/app/prediction/page.js',
    'src/app/page.js',
    'src/app/dashboard/page.js',
    'src/components/EarthTutorial.js',
    'src/components/EarthCharts.js',
    'src/components/EarthBeforeAfterSlider.js',
    'HACKATHON_EARTH.md',
    'DEVPOST_VIDEO_SCRIPT.md',
    'README.md',
  ];
  for (const f of mustExist) {
    it(`exists: ${f}`, () => assert.ok(fs.existsSync(f), `missing ${f}`));
  }

  it('all earth libs syntax check via node --check', async () => {
    const { execSync } = await import('node:child_process');
    const files = ['src/lib/predictionReport.js','src/lib/simulationModel.js','src/lib/gemini.js','src/lib/earthEngine.js'];
    for (const f of files) {
      execSync(`node --check ${f}`, { stdio: 'pipe' });
    }
  });

  it('earth-hackathon branch is ahead of main with 5+ commits', async () => {
    const { execSync } = await import('node:child_process');
    const log = execSync('git log --oneline main..earth-hackathon', { encoding: 'utf8' });
    const commits = log.trim().split('\n').filter(Boolean);
    assert.ok(commits.length >= 5, `expected 5+ earth commits, got ${commits.length}: ${log}`);
    assert.match(log, /earth/i);
  });

  it('predictionReport fallback still works without GEMINI_API_KEY', async () => {
    const orig = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { generateUrbanReport } = await import('../src/lib/predictionReport.js');
    const r = await generateUrbanReport(10, 10, null, 40, 'TestCity');
    assert.ok(r.hotspots.length === 6);
    assert.ok(r.greenFuture.coolingDegrees > 0);
    if (orig) process.env.GEMINI_API_KEY = orig;
  });
});
