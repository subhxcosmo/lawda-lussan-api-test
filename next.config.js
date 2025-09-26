/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['@vercel/postgres', '@vercel/kv'],
  },
  async headers() {
    return [
      {
        source: '/api/lookup',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/lookup',
        destination: '/api/lookup',
      },
    ];
  },
};

module.exports = nextConfig;
