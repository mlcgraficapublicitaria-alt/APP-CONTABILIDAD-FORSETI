import { existsSync } from "node:fs";
const base = ".next/standalone/node_modules";
for (const file of ["@sparticuz/chromium/package.json", "puppeteer-core/package.json"]) {
  if (!existsSync(`${base}/${file}`)) throw new Error(`Dependencia PDF ausente del standalone: ${file}`);
}
