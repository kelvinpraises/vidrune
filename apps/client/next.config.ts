import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Handle Node.js modules that don't work in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
  experimental: {
    esmExternals: true,
  },
};

export default nextConfig;
