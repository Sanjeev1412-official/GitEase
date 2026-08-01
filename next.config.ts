import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "31a6-117-193-174-134.ngrok-free.app",
    "af1b-59-88-130-74.ngrok-free.app",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
