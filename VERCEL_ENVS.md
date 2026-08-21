# Vercel Envs — Copy-Paste Checklist (1 min)

**Dashboard:** https://vercel.com/ishyamprasath/xrplot → Settings → Environment Variables → Add each (Production + Preview + Development):

```
GEMINI_API_KEY=...
OPENROUTER_API_KEY=sk-or-v1-...
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_APP_URL=https://xrplot-360.vercel.app
# Optional GEE real (without, simulated fallback passes)
GEE_SERVICE_ACCOUNT_KEY_JSON={"type":"service_account",...}
```

**CLI (if linked):**
```bash
npm i -g vercel
vercel login
vercel link  # select ishyamprasath/xrplot
pwsh scripts/setup-vercel-env.ps1
vercel --prod
```

**Verify deploy:** https://xrplot-360.vercel.app → should show 🌍 TerraPlot hero. /prediction → Try Delhi 1-Click should build Earth Twin.

**Current branch on Vercel:** `main` (a9f0295 merged from earth-hackathon, 8 commits). Ensure Vercel Production Branch = `main`.
