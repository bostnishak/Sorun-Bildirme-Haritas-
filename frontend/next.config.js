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
        protocol: 'https',
        hostname: 'etiya-project.tr',
      },
    ],
  },
  async rewrites() {
    const defaultBackendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'http://etiya-project-api:3001';
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
