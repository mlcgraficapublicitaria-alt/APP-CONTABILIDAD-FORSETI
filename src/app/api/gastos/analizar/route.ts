import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import { extractExpenseFields } from "@/lib/expense-extraction";
import { requireUser } from "@/lib/renta-fiscal/api";

const localRequire = createRequire(import.meta.url);

async function textFromPdf(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href);
  const parser = new PDFParse({ data: buffer });
  try { return (await parser.getText()).text; } finally { await parser.destroy(); }
}

async function textFromImage(buffer: Buffer) {
  const { createWorker } = await import("tesseract.js");
  const language = localRequire("@tesseract.js-data/spa") as { code: string; gzip: boolean; langPath: string };
  const worker = await createWorker(language.code, undefined, { langPath: language.langPath, gzip: language.gzip });
  try {
    const result = await worker.recognize(buffer);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Adjunta un archivo para analizar." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "El archivo no puede superar 10 MB." }, { status: 400 });
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = file.type === "application/pdf" ? await textFromPdf(buffer) : await textFromImage(buffer);
    if (!text.trim()) return NextResponse.json({ error: "No se ha podido detectar texto en el documento." }, { status: 422 });
    return NextResponse.json({ fields: extractExpenseFields(text) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo analizar el documento." }, { status: 422 });
  }
}
