import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * react-pdf resolves fonts and its own binaries at runtime, so it is left to
   * Node's own resolution instead of being bundled.
   */
  serverExternalPackages: ["@react-pdf/renderer"],

  /**
   * `public/` is served by the CDN and is *not* present on a serverless
   * filesystem, so `Font.register` would fail in production only. Tracing the
   * TTFs into the bundles that render a PDF is what makes the invoice
   * typeface — and with it č ć ž š đ — survive deployment (docs/Tech.md §8).
   */
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./public/fonts/**"],
    "/invoices/**": ["./public/fonts/**"],
    "/dashboard": ["./public/fonts/**"],
  },
};

export default nextConfig;
