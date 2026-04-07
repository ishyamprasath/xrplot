# Array of env vars to add
$envVars = @{
    "MONGO_URI" = 'mongodb+srv://shyam:shyam2006@cluster0.ypbu4bd.mongodb.net/xrplot?appName=Cluster0'
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" = "pk_test_aG9seS1nYXRvci0yMi5jbGVyay5hY2NvdW50cy5kZXYk"
    "CLERK_SECRET_KEY" = "sk_test_BtL7802ljc4hCJpD256Ez9NNhgetJDOntTyRvBPq33"
    "NEXT_PUBLIC_CLERK_SIGN_IN_URL" = "/sign-in"
    "NEXT_PUBLIC_CLERK_SIGN_UP_URL" = "/sign-up"
    "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL" = "/dashboard"
    "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL" = "/dashboard"
    "GEMINI_API_KEY" = "AIzaSyBH_Glz-kshgmtaqDvoQESQtzw2sMjucGc"
    "CLOUDINARY_CLOUD_NAME" = "dkmrrr7ac"
    "CLOUDINARY_API_KEY" = "693232183818178"
    "CLOUDINARY_API_SECRET" = "Iv65nbmdhGShRWSE1q8LwcyQFxw"
    "NEXT_PUBLIC_NVIDIA_API_KEY" = "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"
    "NEXT_PUBLIC_OPENROUTER_API_KEY" = "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"
    "NEXT_PUBLIC_MAPS_API_KEY" = "AIzaSyAo8HrR74BB1RB_Ob-agpSxvDz4b09aFOw"
}

foreach ($key in $envVars.Keys) {
    Write-Host "Adding $key..."
    $value = $envVars[$key]
    # Use -f to force overwrite if it exists, or just add
    echo $value | npx vercel env add $key production
}
