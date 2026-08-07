import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import { extractExpenseFields } from "@/lib/expense-extraction";
import { ensurePdfJsNodeGlobals } from "@/lib/forseti-hours-pdf";
import { requireUser } from "@/lib/renta-fiscal/api";

const localRequire = createRequire(import.meta.url);

async function textFromPdf(buffer: Buffer) {
  ensurePdfJsNodeGlobals();
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href);
  const parser = new PDFParse({ data: buffer });
  try {
    const text = (await parser.getText()).text;
    return { text, headerText: text.split("\n").slice(0, 10).join("\n") };
  } finally { await parser.destroy(); }
}

async function textFromImage(buffer: Buffer) {
  const { createWorker } = await import("tesseract.js");
  const language = localRequire("@tesseract.js-data/spa") as { code: string; gzip: boolean; langPath: string };
  const worker = await createWorker(language.code, undefined, { langPath: language.langPath, gzip: language.gzip });
  try {
    const result = await worker.recognize(buffer, {}, { text: true, blocks: true });
    const headerText = (result.data.blocks ?? [])
      .filter((block) => block.confidence >= 35)
      .sort((a, b) => a.bbox.y0 - b.bbox.y0)
      .slice(0, 5)
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join("\n");
    return { text: result.data.text, headerText };
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
    const extracted = file.type === "application/pdf" ? await textFromPdf(buffer) : await textFromImage(buffer);
    if (!extracted.text.trim()) return NextResponse.json({ error: "No se ha podido detectar texto en el documento." }, { status: 422 });
    return NextResponse.json({ fields: extractExpenseFields(extracted.text, extracted.headerText) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo analizar el documento." }, { status: 422 });
  }
}
