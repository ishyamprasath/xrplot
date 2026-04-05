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
  serverExternalPackages: ['sharp'],
  experimental: {
    proxyClientMaxBodySize: 52428800,
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;
