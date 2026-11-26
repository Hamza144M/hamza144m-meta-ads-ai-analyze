import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@maa/core"],
  // Server-only libraries used by the /api/local routes; loaded from node_modules at runtime.
  serverExternalPackages: ["pdfkit", "exceljs", "docx", "csv-parse"],
  // Monorepo: trace files from the repository root so workspace packages are included on Vercel.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
