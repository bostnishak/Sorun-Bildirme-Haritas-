/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
      },
      {
        protocol: 'http',
        hostname: '92.5.71.25',
        port: '9005',
      },
      {
        protocol: 'http',
        hostname: '92.5.71.25',
        port: '3001',
      },
      {
        protocol: 'https',
        hostname: 'etiya-project.tr',
      },
    ],
  },
  async rewrites() {
    const defaultBackendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'http://92.5.71.25:3001';
    const backendUrl = process.env.BACKEND_URL || defaultBackendUrl;
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
