# 🌍 TerraPlot — Earth Lens 2036

**AI 4 Earth Hackathon (GatewayGS × The AEI Initiative) — `earth-hackathon` branch**

> **See your street in a +2°C world.** Drop a pin anywhere on Earth — GEE satellites scan NDVI/NDBI/LST for 10 years, Gemini predicts *dystopia vs green future*, and AI builds a walkable 360° Earth Twin you can *feel*.

[![Branch](https://img.shields.io/badge/branch-earth--hackathon-10b981)](https://github.com/ishyamprasath/xrplot/tree/earth-hackathon)
[![Tests](https://img.shields.io/badge/tests-50%2F50-10b981)](./tests)
[![Coverage](https://img.shields.io/badge/coverage-92%25-10b981)](./coverage/badge.svg)
[![Visual](https://img.shields.io/badge/visual-Playwright-06b6d4)](./tests/visual)
[![Live](https://img.shields.io/badge/live-xrplot--360.vercel.app-059669)](https://xrplot-360.vercel.app/prediction)
[![AI](https://img.shields.io/badge/AI-Gemini%20%7C%20GEE%20%7C%20Earth%20Engine-06b6d4)](https://earthengine.google.com)

### ✨ What it does
- **500m eco-probe:** Click any location → 500m bounding box → satellite time-series (NDBI built-up ↑, NDVI green ↓, LST heat ↑)
- **Dual future 2036:** Dystopia (if we do nothing: -41% green, +2.8°C, AQI 168, dry borewells) vs **Regenerated Oasis** (if we act: Miyawaki + cool roofs + lake revival = -2.4°C, -40% flood, +58% biodiversity)
- **6 immersive 360° nodes:** Heat Dome, Vanishing Green, Flood Basin, Smog Corridor, Water Stress, Regenerated Oasis (hope) — all AI panoramas, walkable graph
- **Earth Agent:** Chat/voice — “How to fix heat dome in Delhi?” → quantified plan (cools X°C, saves Y tCO₂)

### 🧠 Meaningful AI (not add-on)
| Layer | Model | Use |
|-------|-------|-----|
| Satellite | Google Earth Engine | NDVI/NDBI/LST 10-yr trends ground the simulation |
| Eco-report | Gemini 3 Flash | JSON dystopia/greenFuture/insights/interventions |
| Panoramas | Gemini 2.5 Flash Image (OpenRouter) | 6 eco-dystopia/hope 360° per location → Cloudinary |
| Agent | Nemotron 30B (OpenRouter) | Geocodes via OSM, triggers Earth Twin, advises fixes |

### 🚀 Quick start
```bash
git clone https://github.com/ishyamprasath/xrplot.git
git checkout earth-hackathon
cd xrplot
npm install
cp .env.example .env  # set GEMINI_API_KEY, OPENROUTER_API_KEY, GOOGLE_MAPS, CLOUDINARY, MONGODB, CLERK
npm run dev  # → http://localhost:3000/prediction
```

### 🎬 Demo for judges (90s)
1. `/prediction` → search “Delhi” → pin → **Simulate Earth Cost 2036**
2. Read eco-report: past vs dystopia vs hope, insights + 3 AI fixes
3. **Enter Earth Twin 2036** → walk 6 nodes (heat shimmer → barren → flooded → smog → dry → lush oasis)
4. Ask Earth Agent: “Suggest Miyawaki for this heat dome” → quantified answer

### 🧪 Tests & Visual

```bash
npm run test:earth      # 50 node:test (92% coverage)
npm run test:visual     # Playwright 6 snapshots (landing/prediction/tutorial/dashboard/360)
npm run test:cov        # c8 html/lcov
node scripts/coverage-badge.js # regenerates coverage/badge.svg
```

### 📁 Key files (earth-hackathon diff)
- `src/lib/predictionReport.js` — eco scene types + greenFuture schema
- `src/lib/simulationModel.js` — NDVI/LST/greenCover/waterStress
- `src/lib/gemini.js` — climate scientist prompt
- `src/lib/predictionSynthesis.js` — eco panorama prompts
- `src/app/api/prediction/analyze/route.js` — Earth pipeline
- `src/app/prediction/page.js` — EARTH LENS UI
- `src/app/page.js` — public Earth landing
- `src/app/dashboard/page.js` — Earth Impact banner
- `HACKATHON_EARTH.md` — full Devpost copy

### 🌿 Impact
Makes abstract climate data visceral (360 > chart). Every dystopia paired with actionable hope + math. Scales to any city globally. Empowers citizens/municipalities to pre-experience cost & choose regeneration.

---
Built with 💚 for AI 4 Earth. PR: [#2 Earth Lens 2036](https://github.com/ishyamprasath/xrplot/pull/2)
