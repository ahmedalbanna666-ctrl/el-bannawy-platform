import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@el-bannawy/shared"],
};

export default nextConfig;
