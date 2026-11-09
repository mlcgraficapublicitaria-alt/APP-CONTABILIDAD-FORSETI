import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    cpus: 1,
    workerThreads: true,
  },
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.8.93"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "./scripts/render-invoice-pdf.mjs", "./node_modules/@sparticuz/chromium/**/*", "./node_modules/puppeteer-core/**/*"],
  },
};

export default nextConfig;
