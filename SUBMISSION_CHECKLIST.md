# ✅ Final Submission Checklist — Before Aug 23 02:30 IST

## 1. Vercel (1 min)
- [ ] Vercel Dashboard → ishyamprasath/xrplot → Settings → Environment Variables → paste from `VERCEL_ENVS.md` (Production+Preview)
- [ ] Verify deploy: https://xrplot-360.vercel.app shows TerraPlot hero
- [ ] Verify /prediction → Try Delhi 1-Click builds twin (60-90s) → Enter 360° works

## 2. Video (5 min)
- [ ] Open DEVPOST_VIDEO_SCRIPT.md → record screen + mic (OBS/Loom) following 0:00-1:30 beats
- [ ] Upload to YouTube **unlisted** → copy link
- [ ] Playwright screenshots: `npx playwright test` locally or use manual screenshots (4 needed for Devpost)

## 3. Devpost (3 min)
- [ ] Create submission at GatewayGS hackathon page → paste sections from DEVPOST_READY.md
- [ ] Title: TerraPlot — Earth Lens 2036 | Tagline: Drop a pin. See dystopia vs green future...
- [ ] Add Links: GitHub `https://github.com/ishyamprasath/xrplot` + Live `https://xrplot-360.vercel.app/prediction` + Video YouTube
- [ ] Upload 4 screenshots + (optional) slides
- [ ] Add team members (students only) → Submit → screenshot confirmation

## 4. Verify
- [ ] `npm run test:earth` 50/50 locally
- [ ] GitHub main at a9f0295 (merged earth-hackathon)
- [ ] Devpost status = Submitted before deadline

**If Vercel env missing:** demo still works via simulated fallback — mention in Devpost "GEE REAL when creds set, else simulated for reviewers".

