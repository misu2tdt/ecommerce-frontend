import type { NextConfig } from "next";

validateApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;

function validateApiBaseUrl(value: string | undefined): void {
  if (!value?.trim()) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured for the build.");
  }
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL.");
  }
}
