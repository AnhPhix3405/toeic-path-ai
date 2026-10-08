import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/auth/reset-password",
        destination: "/reset-password",
      },
      {
        source: "/auth/forgot-password",
        destination: "/forgot-password",
      },
      {
        source: "/auth/login",
        destination: "/login",
      },
      {
        source: "/auth/register",
        destination: "/register",
      },
    ];
  },
};

export default nextConfig;
