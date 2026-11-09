import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PDF_TIMEOUT_MS = 45_000;

/**
 * Imprime exactamente el documento canónico que usa la acción manual.
 * Chromium se ejecuta como proceso hijo aislado: no hay sesión ni navegador humano.
 */
export async function renderInvoicePdf(html: string): Promise<Buffer> {
  if (!html.trim().startsWith("<!doctype html>")) throw new Error("El documento canónico de factura no es HTML completo.");
  const directory = await mkdtemp(path.join(tmpdir(), "forseti-invoice-pdf-"));
  const id = randomUUID();
  const htmlPath = path.join(directory, `${id}.html`);
  const pdfPath = path.join(directory, `${id}.pdf`);
  const scriptPath = path.join(process.cwd(), "scripts", "render-invoice-pdf.mjs");
  try {
    await writeFile(htmlPath, html, { mode: 0o600 });
    await execFileAsync(process.execPath, [scriptPath, htmlPath, pdfPath], {
      timeout: PDF_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    const pdf = await readFile(pdfPath);
    if (pdf.length < 512 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      throw new Error("El proceso de impresión canónica no generó un PDF válido.");
    }
    return pdf;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
