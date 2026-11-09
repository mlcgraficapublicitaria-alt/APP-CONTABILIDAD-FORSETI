import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const sandbox = mkdtempSync(path.join(tmpdir(), "forseti-standalone-pdf-"));
const html = path.join(sandbox, "canonical.html");
const pdf = path.join(sandbox, "canonical.pdf");
try {
  writeFileSync(html, "<!doctype html><html><head><style>body{font-family:Arial;color:#222}.brand{color:#74c6ec}</style></head><body><h1 class=brand>FORSETI</h1><p>Preflight documento canónico</p></body></html>", { mode: 0o600 });
  execFileSync(process.execPath, ["scripts/render-invoice-pdf.mjs", html, pdf], { cwd: ".next/standalone", stdio: "pipe", timeout: 60_000 });
  const bytes = readFileSync(pdf);
  if (bytes.length < 512 || bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Preflight de impresión canónica inválido.");
  const chromium = path.join(".next", "standalone", ".forseti-pdf-runtime", "chromium");
  if ((statSync(chromium).mode & 0o100) === 0) throw new Error("El binario Chromium standalone no es ejecutable.");
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
