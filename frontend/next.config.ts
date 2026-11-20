import type { NextConfig } from "next";

// The browser only ever talks to this Next.js server. Requests to /api/* are
// forwarded to the backend. The address is read at build time (`next build`),
// so it is baked into the build: http://backend:8000 inside Docker Compose,
// http://localhost:8000 in development mode.
export const DEFAULT_API_INTERNAL_URL = "http://backend:8000";

export function apiInternalUrl(): string {
  return (process.env.API_INTERNAL_URL || DEFAULT_API_INTERNAL_URL).replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
