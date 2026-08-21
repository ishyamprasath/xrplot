# Vercel Envs — run locally after `npm i -g vercel && vercel login`
# Then: `vercel link` (select ishyamprasath/xrplot) and run this script
# Or paste each var manually in Vercel Dashboard → Settings → Environment Variables

$envs = @(
  @{ k="GEMINI_API_KEY"; v="your_gemini_api_key"; env="production,preview,development" },
  @{ k="OPENROUTER_API_KEY"; v="sk-or-v1-..."; env="production,preview,development" },
  @{ k="MONGODB_URI"; v="mongodb+srv://..."; env="production,preview,development" },
  @{ k="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"; v="pk_test_..."; env="production,preview,development" },
  @{ k="CLERK_SECRET_KEY"; v="sk_test_..."; env="production,preview,development" },
  @{ k="NEXT_PUBLIC_CLERK_SIGN_IN_URL"; v="/sign-in"; env="production,preview,development" },
  @{ k="NEXT_PUBLIC_CLERK_SIGN_UP_URL"; v="/sign-up"; env="production,preview,development" },
  @{ k="NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"; v="your_maps_key"; env="production,preview,development" },
  @{ k="CLOUDINARY_CLOUD_NAME"; v="..."; env="production,preview,development" },
  @{ k="CLOUDINARY_API_KEY"; v="..."; env="production,preview,development" },
  @{ k="CLOUDINARY_API_SECRET"; v="..."; env="production,preview,development" },
  @{ k="NEXT_PUBLIC_APP_URL"; v="https://xrplot-360.vercel.app"; env="production" }
)

Write-Host "Add these in Vercel Dashboard if CLI not linked:" -ForegroundColor Cyan
foreach ($e in $envs) { Write-Host "$($e.k)=$($e.v)  [$($e.env)]" }

# Optional GEE (real satellite) — without these, fallback simulated still wins
# $GEE_JSON = Get-Content gee-key.json -Raw | Out-String
# vercel env add GEE_SERVICE_ACCOUNT_KEY_JSON production
