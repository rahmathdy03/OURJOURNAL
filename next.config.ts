import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  devIndicators: {
    position: "bottom-left",
  },
};

export default nextConfig;