import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const [htmlPath, pdfPath] = process.argv.slice(2);
if (!htmlPath || !pdfPath) throw new Error("Uso: render-invoice-pdf.mjs <html> <pdf>");
// Hostinger monta /tmp como noexec. Sparticuz consulta TMPDIR al extraer Chromium,
// por lo que el binario debe vivir en un directorio privado del release, no en /tmp.
const executableTmp = process.env.FORSETI_CHROMIUM_TMPDIR || path.join(process.cwd(), ".forseti-pdf-runtime");
await mkdir(executableTmp, { recursive: true, mode: 0o700 });
process.env.TMPDIR = executableTmp;
process.env.TEMP = executableTmp;
process.env.TMP = executableTmp;
const executablePath = process.env.FORSETI_CHROMIUM_PATH || await chromium.executablePath();
// La extracción de Chromium en el filesystem de Hostinger conserva el binario
// como 0644. No delegamos este permiso en el proceso padre: se garantiza justo
// antes del spawn y el renderer falla cerrado si no se puede aplicar.
await chmod(executablePath, 0o700);
const browser = await puppeteer.launch({
  executablePath,
  // Puppeteer crea este perfil en /tmp por defecto. Hostinger lo monta noexec;
  // mantenemos binario y perfil juntos en el directorio privado ejecutable.
  userDataDir: path.join(executableTmp, "profile"),
  headless: true,
  // Hostinger bloquea TCP loopback para DevTools; el pipe evita red incluso local.
  pipe: true,
  args: [...chromium.args, "--disable-background-networking"],
  timeout: 45_000,
});
try {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "load", timeout: 45_000 });
  const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } }));
  if (pdf.length < 512 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("Chromium no generó un PDF válido.");
  await writeFile(pdfPath, pdf, { mode: 0o600 });
} finally { await browser.close(); }
