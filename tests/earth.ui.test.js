import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Earth UI — landing, prediction, dashboard, tutorial', () => {
  it('landing page is public Earth hero with Try Delhi, NDVI stats, judge strip', () => {
    const txt = fs.readFileSync('src/app/page.js', 'utf8');
    assert.match(txt, /TerraPlot/);
    assert.match(txt, /EARTH LENS 2036/);
    assert.match(txt, /See your street/);
    assert.match(txt, /\+2°C world/);
    assert.match(txt, /Try Delhi in 1 Click|Launch Earth Lens/);
    assert.match(txt, /JUDGE QUICK START/);
    assert.match(txt, /GATEWAYGS/);
    assert.ok(!txt.includes("router.replace('/sign-in')") || txt.includes('isLoaded'), 'landing should not force sign-in');
  });

  it('prediction page has Earth Lens, demo, progress, tutorial, tooltips', () => {
    const txt = fs.readFileSync('src/app/prediction/page.js', 'utf8');
    assert.match(txt, /EARTH LENS/);
    assert.match(txt, /Try Delhi in 1 Click/);
    assert.match(txt, /What.s NDVI\/LST/);
    assert.match(txt, /EarthTutorial/);
    assert.match(txt, /Scanning GEE/);
    assert.match(txt, /EarthCharts/);
    assert.match(txt, /Dystopia 2036/);
    assert.match(txt, /Green Future 2036/);
    assert.match(txt, /TIP FOR JUDGES/);
  });

  it('EarthTutorial has 5 steps with spotlight progress', () => {
    const txt = fs.readFileSync('src/components/EarthTutorial.js', 'utf8');
    assert.match(txt, /Welcome to Earth Lens/);
    assert.match(txt, /Plant your 500m probe/);
    assert.match(txt, /Simulate Earth Cost/);
    assert.match(txt, /Walk the 360/);
    assert.match(txt, /Ask Earth Agent/);
    assert.match(txt, /localStorage/);
    assert.match(txt, /30 SEC TOUR/);
    const steps = (txt.match(/title:/g) || []).length;
    assert.ok(steps >= 5, `expected 5 titles, got ${steps}`);
  });

  it('EarthCharts renders NDVI/NDBI/LST lines + dystopia vs hope bars', () => {
    const txt = fs.readFileSync('src/components/EarthCharts.js', 'utf8');
    assert.match(txt, /NDVI/);
    assert.match(txt, /NDBI/);
    assert.match(txt, /LST/);
    assert.match(txt, /MiniLine/);
    assert.match(txt, /BarPair/);
    assert.match(txt, /GEE_REAL|SIMULATED/);
    assert.match(txt, /Dystopia.*Hope|2036 D/i);
  });

  it('dashboard has Earth Impact banner with 4 KPIs + twins', () => {
    const txt = fs.readFileSync('src/app/dashboard/page.js', 'utf8');
    assert.match(txt, /EARTH IMPACT/);
    assert.match(txt, /Earth Twins/);
    assert.match(txt, /Green Lost|Heat Added|Flood Risk|Hope Cools/);
    assert.match(txt, /Scan New Location/);
  });

  it('layout metadata is Earth SEO', () => {
    const txt = fs.readFileSync('src/app/layout.js', 'utf8');
    assert.match(txt, /TerraPlot/);
    assert.match(txt, /Earth Lens 2036/);
    assert.match(txt, /NDVI\/NDBI\/LST/);
  });

  it('BeforeAfter slider exists for dystopia vs hope', () => {
    const txt = fs.readFileSync('src/components/EarthBeforeAfterSlider.js', 'utf8');
    assert.match(txt, /DYSTOPIA/);
    assert.match(txt, /GREEN FUTURE/);
    assert.match(txt, /drag to compare/);
  });

  it('HACKATHON docs exist with demo script', () => {
    assert.ok(fs.existsSync('HACKATHON_EARTH.md'));
    assert.ok(fs.existsSync('DEVPOST_VIDEO_SCRIPT.md'));
    assert.ok(fs.existsSync('README.md'));
    const hack = fs.readFileSync('HACKATHON_EARTH.md', 'utf8');
    assert.match(hack, /Problem/);
    assert.match(hack, /Solution: Earth Lens/);
    assert.match(hack, /GEE/);
    const script = fs.readFileSync('DEVPOST_VIDEO_SCRIPT.md', 'utf8');
    assert.match(script, /0:00.*HOOK/);
    assert.match(script, /Submission Checklist/);
  });
});
