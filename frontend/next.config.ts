import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    authInterrupts: true,
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "react-day-picker",
      "@hookform/resolvers",
      "react-hook-form",
    ],
  },
  async redirects() {
    return [
      { source: "/about", destination: "/#about-us", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
