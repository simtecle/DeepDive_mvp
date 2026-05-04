import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Allow YouTube thumbnails used by thumb(): https://i.ytimg.com/vi/<id>/hqdefault.jpg
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
    ],
  },
};

export default nextConfig;
