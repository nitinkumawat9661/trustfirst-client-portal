import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@trustfirst/ui", "@trustfirst/config", "@trustfirst/database"],
};

export default nextConfig;
