import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components / Instant Nav overlays block Safari (iPad) demos with
  // "uncached data" Insights and can surface false Runtime SyntaxErrors.
  // Keep the app as ordinary dynamic request rendering for reliability.
  devIndicators: false,
  // Allow HTTPS tunnel hosts (Safari / iPad demos) to hit the Next.js server.
  allowedDevOrigins: [
    "*.lhr.life",
    "*.localhost.run",
    "*.loca.lt",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
  // beforeFiles: every upload goes through the tenant check, even files that
  // happened to exist in /public at build time.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }],
      afterFiles: [],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
