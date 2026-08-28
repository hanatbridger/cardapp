import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating N build-indicator button is dev-only chrome; it was
  // showing up in every design review screenshot.
  devIndicators: false,
};

export default nextConfig;
