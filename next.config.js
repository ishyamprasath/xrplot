/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  // Include Vertex AI SDK and sharp as server-only (not bundled for the browser)
  serverExternalPackages: ['sharp', '@google-cloud/vertexai', 'google-auth-library'],
  experimental: {
    // Allow large payloads (24 hi-res images can exceed 50 MB)
    proxyClientMaxBodySize: 104857600,
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
