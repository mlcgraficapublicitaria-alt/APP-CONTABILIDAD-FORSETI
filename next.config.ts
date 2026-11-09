import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    cpus: 1,
    workerThreads: true,
  },
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.8.93"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      // El renderer Chromium se ejecuta como proceso hijo: Next no puede
      // inferir su grafo ESM dinámico. Trazamos el árbol completo para que el
      // release standalone no omita dependencias en producción.
      "./node_modules/**/*",
      "./scripts/render-invoice-pdf.mjs",
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/puppeteer-core/**/*",
      "./node_modules/@puppeteer/browsers/**/*",
      "./node_modules/chromium-bidi/**/*",
      "./node_modules/devtools-protocol/**/*",
      "./node_modules/ws/**/*",
      "./node_modules/proxy-agent/**/*",
      "./node_modules/extract-zip/**/*",
      "./node_modules/yargs/**/*",
      "./node_modules/semver/**/*",
      "./node_modules/follow-redirects/**/*",
      "./node_modules/tar-fs/**/*",
    ],
  },
};

export default nextConfig;
