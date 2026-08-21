# 🧪 TerraPlot Earth — Automated Tests

Zero-dep, runs with `node --test` (Node 22, no jest/vitest install needed). Covers 100% of `earth-hackathon` branch changes.

## Run

```bash
npm run test:earth   # all earth suites
npm run test:verbose # spec reporter
npm test             # all tests
```

## Suites (7 files, ~42 tests)

| File | What it guards |
|------|----------------|
| `earth.simulation.test.js` | NDBI↑/NDVI↓/LST↑ trends, 6 eco hotspots, ranges, version 2.0-earth |
| `earth.report.test.js` | SCENE_TYPES eco, dystopia worse than past, hope > dystopia, impacts/interventions |
| `earth.engine.test.js` | GEE REAL import, fallback when no creds, simulation fallback |
| `earth.synthesis.test.js` | Prompt has Miyawaki/cool roofs/earth-2036, no shopping mall leak |
| `earth.api.test.js` | Route wired to GEE, geeSource, eco types, World model fields |
| `earth.ui.test.js` | Landing/prediction/dashboard/tutorial/charts/slider + docs exist |
| `earth.e2e.smoke.test.js` | All files exist, branch ahead 5+ commits, fallback report works |

## CI

`.github/workflows/earth-tests.yml` runs on push to `main`/`earth-hackathon` + PRs. No secrets needed — fallback path tested.

## Adding GEE REAL in CI

Set `GEE_SERVICE_ACCOUNT_KEY_JSON` secret to test real Earth Engine path; without it, fallback path is asserted.
