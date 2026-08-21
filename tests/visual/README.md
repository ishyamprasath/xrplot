# 🎭 Playwright Visual — 360°

```bash
npx playwright install --with-deps chromium
npm run test:visual                 # run snapshots
npm run test:visual:update          # update baselines
npx playwright show-report
```

Snaps stored in `tests/visual/__snapshots__/`. Baselines per OS — commit chromium only.

Coverage: landing hero, prediction empty, tutorial tour, dashboard Earth Impact, 360 cards.
