import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function chromiumPath() {
  return process.env.FORSETI_CHROMIUM_PATH || "/usr/bin/chromium";
}

/** Renderiza HTML ya validado con Chromium sin navegador humano ni red. */
export async function renderInvoicePdf(html: string): Promise<Buffer> {
  if (!html.trim().startsWith("<!doctype html>")) throw new Error("El documento canónico de factura no es HTML completo.");
  const directory = await mkdtemp(path.join(tmpdir(), "forseti-invoice-pdf-"));
  const id = randomUUID();
  const htmlPath = path.join(directory, `${id}.html`);
  const pdfPath = path.join(directory, `${id}.pdf`);
  try {
    await writeFile(htmlPath, html, { mode: 0o600 });
    await execFileAsync(chromiumPath(), [
      "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
      `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`,
    ], { timeout: 45_000, maxBuffer: 1024 * 1024 });
    const pdf = await readFile(pdfPath);
    if (pdf.length < 512 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("Chromium no generó un PDF válido.");
    return pdf;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
