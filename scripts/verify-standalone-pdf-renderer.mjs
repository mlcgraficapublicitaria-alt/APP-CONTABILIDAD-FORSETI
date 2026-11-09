import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const base = ".next/standalone/node_modules";
for (const file of ["@sparticuz/chromium/package.json", "puppeteer-core/package.json", "follow-redirects/index.js"]) {
  if (!existsSync(`${base}/${file}`)) throw new Error(`Dependencia PDF ausente del standalone: ${file}`);
}
execFileSync(process.execPath, ["--input-type=module", "-e", "await import('@sparticuz/chromium'); await import('puppeteer-core');"], { cwd: ".next/standalone", stdio: "pipe" });
