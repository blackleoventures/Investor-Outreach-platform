/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['antd', '@ant-design/cssinjs'],
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['antd'],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Speed up builds (skip type checking and eslint during builds)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(png|jpg|jpeg|gif|svg|webp|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, must-revalidate' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/:path*`
          : "http://localhost:5000/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
