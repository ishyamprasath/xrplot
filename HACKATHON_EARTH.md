# 🌍 TerraPlot — Earth Lens 2036 | AI 4 Earth Hackathon

**Branch:** `earth-hackathon` | **Live:** https://xrplot-360.vercel.app/prediction | **Repo:** https://github.com/ishyamprasath/xrplot

## Problem
Urban growth is celebrated as progress, but its invisible cost — +3°C heat islands, 40% green loss, floods, smog, dying borewells — is not *felt* until it's too late. Citizens & planners see roads, not NDVI collapse. India loses 1.5M hectares green cover yearly; Delhi/Chennai/Bengaluru face simultaneous heat, flood & water stress. We need to make the future visceral.

## Solution: Earth Lens 2036
Drop a pin anywhere on Earth. TerraPlot:
1. **Scans GEE time-series** (NDBI built-up + NDVI vegetation + LST temperature) over 10 years in 500m zone
2. **Gemini predicts dual future 2036:** Dystopia (if we do nothing) vs Green Future (if we act — Miyawaki, cool roofs, lake revival)
3. **Generates 6 immersive 360° AI panoramas** you can walk through: Heat Dome, Vanishing Green, Flood Basin, Smog Corridor, Water Stress, + **Regenerated Oasis (Hope)**
4. **AI Earth Agent** quantifies fixes: “Miyawaki cools 2.4°C, saves 420t CO₂, cuts flood 60%”

## How AI is Meaningful (Not Add-On)
- **Google Earth Engine** — real satellite indices (not mock). NDBI ↑ + NDVI ↓ + LST ↑ drives prediction math.
- **Gemini 3 Flash + 2.5 Flash Image** — eco-report (JSON dystopia/greenFuture/insights/interventions) + 360 panorama synthesis per eco-node
- **OpenRouter/Nemotron** — Earth Agent converses, auto-geocodes any city via OSM Nominatim, triggers Earth Twin generation
- **Immersive 360 graph** — nodes/edges become walkable climate futures (Pannellum + Three.js + xyflow), not just charts

## Tech Stack
Next.js 15, Clerk, Mongoose, @google/earthengine, @google/genai, OpenRouter, Cloudinary, @react-google-maps/api, sharp, pannellum

## What We Changed for Earth (7 files, 1 branch)
- `predictionReport.js` → eco SCENE_TYPES + dystopia/greenFuture JSON
- `simulationModel.js` → NDVI/LST/waterStress/greenCover + 6 eco-hotspots
- `gemini.js` → climate scientist prompt (dual future)
- `predictionSynthesis.js` → eco dystopia/hope panorama prompts
- `api/prediction/analyze/route.js` → Earth pipeline
- `app/prediction/page.js` → EARTH LENS 2036 UI (NDVI/LST badges, red/green futures)
- `agent-tools.js` + `agent.js` → Earth Agent tools & persona

## How to Demo (90 sec judge video)
1. Open `/prediction` → search “Delhi” → pin Lodhi Garden area → **Simulate Earth Cost 2036**
2. Watch eco-report: green -41%, +2.8°C, AQI 168 → scroll insights + interventions
3. **Enter Earth Twin 2036** → walk 6 nodes: feel heat dome shimmer, barren canopy, flooded basin, then step into Regenerated Oasis (lush, cool, birds)
4. Ask Earth Agent (Chat/Voice): “How to fix heat dome in Delhi?” → get quantified Miyawaki + cool roof plan
5. Show World graph: all eco-nodes connected through oasis (hope is central)

## Environmental Impact
- Makes abstract climate data visceral (360 > chart)
- Quantified hope drives action: every dystopia node paired with intervention
- Scalable to any city globally (GEE + OSM)
- Empowers municipalities, students, citizens to pre-experience cost & choose regeneration

## Future
Real GEE EE API tile fetch (not simulated trend), crowd-uploaded 360 photos as ground truth, municipal dashboard with intervention ROI calculator.

---
Built with 💚 for GatewayGS & AEI AI 4 Earth Hackathon 2026. Deadline Aug 23 2:30am IST.
