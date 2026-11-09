import { readFile, writeFile } from "node:fs/promises";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const [htmlPath, pdfPath] = process.argv.slice(2);
if (!htmlPath || !pdfPath) throw new Error("Uso: render-invoice-pdf.mjs <html> <pdf>");
const browser = await puppeteer.launch({ executablePath: process.env.FORSETI_CHROMIUM_PATH || await chromium.executablePath(), headless: true, args: [...chromium.args, "--disable-background-networking"], timeout: 45_000 });
try {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "load", timeout: 45_000 });
  const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" } }));
  if (pdf.length < 512 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("Chromium no generó un PDF válido.");
  await writeFile(pdfPath, pdf, { mode: 0o600 });
} finally { await browser.close(); }
