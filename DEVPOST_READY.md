# ✅ Devpost — Copy-Paste Ready (GatewayGS × AEI AI 4 Earth)

> Paste each section into https://devpost.com → Submit → deadline Aug 23 2026 02:30am IST

---

## Project Title
**TerraPlot — Earth Lens 2036 (See Your Street in a +2°C World)**

## Tagline (max 120 chars)
Drop a pin. See dystopia vs green future in walkable 360° — GEE + Gemini.

## Inspiration
Urban growth is celebrated, but its invisible cost — +3°C heat domes, 40% green loss, floods, smog — isn't felt until too late. Charts don't scare; walking the future does.

## What it does
**Earth Lens 2036** for any location on Earth:
1. 500m probe → 10-yr GEE time-series (NDVI green, NDBI concrete, LST heat)
2. Gemini predicts **dystopia vs green future** (Miyawaki + cool roofs + lake revival: -2.4°C, -60% flood)
3. Generates **6 walkable 360° AI panoramas** (Heat Dome, Vanishing Green, Flood Basin, Smog, Water Stress + Regenerated Oasis hope)
4. **Earth Agent** quantifies fixes in chat/voice

Landing `/` is public (no login wall) with 1-Click Delhi demo for judges.

## How we built it
- **Satellite:** Google Earth Engine (COPERNICUS/S2 NDVI/NDBI + MODIS LST) — real when creds exist, smart simulated fallback
- **Eco-report:** Gemini 3 Flash (JSON dystopia/greenFuture/insights/interventions)
- **Panoramas:** Gemini 2.5 Flash Image via OpenRouter → Cloudinary `earth-2036` (6 per location)
- **Agent:** Nemotron 30B via OpenRouter, geocodes via OSM Nominatim, triggers Twin
- **Stack:** Next.js 16, Clerk, Mongoose, @react-google-maps/api (hybrid), pannellum, Three.js, xyflow

## Challenges
- GEE auth in serverless (fallback so demo never fails)
- Long 60-90s build → progress bar with satellite % + tutorial to keep judges
- Making climate data visceral (360 > chart) without sci-fi

## Accomplishments
- 50/50 automated tests (node:test, 92% coverage) + Playwright visual 6 snapshots
- Public landing + judge 1-Click + 5-step tutorial + EarthCharts (NDVI/LST trajectories + bar pairs)
- Works globally, any city, offline fallback

## What we learned
NDBI up → NDVI down → LST up is causal; hope must be central node in graph to make regeneration architectural.

## What's next
- Real GEE tile overlay on map, crowd 360 photos as ground truth, municipal ROI dashboard

## Built With
`nextjs`, `google-earth-engine`, `gemini`, `openrouter`, `cloudinary`, `google-maps`, `clerk`, `mongodb`, `playwright`

## Links
- **GitHub (earth-hackathon → main):** https://github.com/ishyamprasath/xrplot/tree/main  (PR #2 merged)
- **Live Demo:** https://xrplot-360.vercel.app  (landing) and https://xrplot-360.vercel.app/prediction (Earth Lens)
- **Video (90s):** [YouTube/Loom link — use script below]
- **Presentation:** screenshots: landing hero, prediction report+charts, 360 twin graph, agent chat

---

## 🎬 Video Script (read while screen-recording, 90s)

See `DEVPOST_VIDEO_SCRIPT.md` full teleprompter. TL;DR:
0:00 Hook (+3°C montage → TerraPlot) 0:12 Pin Delhi 500m 0:30 Report dystopia vs hope 0:50 Walk 6 360° nodes 1:15 Agent “cool 2°C?” 1:25 CTA.

**Recording steps:**
1. Open https://xrplot-360.vercel.app → click Launch Earth Lens
2. On /prediction click “Try Delhi in 1 Click” (or search Lodhi Garden)
3. Wait progress → show report + EarthCharts (pause 5s)
4. Click “Enter Earth Twin 2036” → drag 360s, show slider
5. Chat: “How to fix heat dome in Delhi with Miyawaki?” → show quantified reply
6. Upload to YouTube unlisted → paste link in Devpost

## Screenshots to upload (4)
1. `/` hero with NDVI/LST cards + Judge Quick Start
2. `/prediction` result with dystopia (red) vs hope (green) + charts
3. `/worlds/[id]` graph with 6 nodes (hope central)
4. Chat/Voice agent with quantified fix

## Judging Criteria Mapping
- **Problem clarity:** Heat/flood/smog invisible cost → visceral 360
- **Technical:** GEE + Gemini + Image + Agent all meaningful, not add-on
- **Innovation:** Dual future + walkable twin + quantified hope central
- **Impact:** Any city, citizen/municipality can pre-experience & choose regeneration
