import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const PDF_TIMEOUT_MS = 45_000;

/** Renderiza HTML ya validado con Chromium sin navegador humano ni red. */
export async function renderInvoicePdf(html: string): Promise<Buffer> {
  if (!html.trim().startsWith("<!doctype html>")) throw new Error("El documento canónico de factura no es HTML completo.");
  const directory = await mkdtemp(path.join(tmpdir(), "forseti-invoice-pdf-"));
  const id = randomUUID();
  const htmlPath = path.join(directory, `${id}.html`);
  try {
    await writeFile(htmlPath, html, { mode: 0o600 });
    const browser = await puppeteer.launch({
      executablePath: process.env.FORSETI_CHROMIUM_PATH || await chromium.executablePath(),
      headless: true,
      args: [...chromium.args, "--disable-background-networking"],
      timeout: PDF_TIMEOUT_MS,
    });
    try {
      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: "load", timeout: PDF_TIMEOUT_MS });
      const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } }));
      if (pdf.length < 512 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("Chromium no generó un PDF válido.");
      return pdf;
    } finally {
      await browser.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
