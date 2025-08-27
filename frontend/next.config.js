/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['antd'],
  experimental: {
    esmExternals: 'loose'
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
