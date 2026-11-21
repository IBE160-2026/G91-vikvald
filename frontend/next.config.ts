import type { NextConfig } from "next";

// The browser only ever talks to this Next.js server. Requests to /api/* are
// forwarded to the backend. The address is read at build time (`next build`),
// so it is baked into the build: http://backend:8000 inside Docker Compose,
// http://localhost:8000 in development mode.
export const DEFAULT_API_INTERNAL_URL = "http://backend:8000";

export function apiInternalUrl(): string {
  return (process.env.API_INTERNAL_URL || DEFAULT_API_INTERNAL_URL).replace(/\/+$/, "");
}

// The largest request body Next.js passes on to the backend. The default (10 MB)
// would cut off a PDF just under the backend's MAX_UPLOAD_MB (20 MB by default),
// so it is set well above it. A bigger file still reaches the backend's own size
// check (from Content-Length) and gets FILE_TOO_LARGE. Raise this too if
// MAX_UPLOAD_MB is set above about 30.
export const PROXY_MAX_BODY_SIZE = "32mb";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    proxyClientMaxBodySize: PROXY_MAX_BODY_SIZE,
  },
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
