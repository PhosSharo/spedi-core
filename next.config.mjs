/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://127.0.0.1:3001/:path*'
          : 'http://127.0.0.1:3001/:path*'
      }
    ];
  }
};

export default nextConfig;
