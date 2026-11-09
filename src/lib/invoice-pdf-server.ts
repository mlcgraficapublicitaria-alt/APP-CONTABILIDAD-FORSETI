import PDFDocument from "pdfkit";

/** Renderiza HTML ya validado con Chromium sin navegador humano ni red. */
export async function renderInvoicePdf(html: string): Promise<Buffer> {
  if (!html.trim().startsWith("<!doctype html>")) throw new Error("El documento canónico de factura no es HTML completo.");
  const text = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: "Factura FORSETI" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => { const pdf = Buffer.concat(chunks); pdf.length >= 512 && pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) ? resolve(pdf) : reject(new Error("PDF automático inválido.")); });
    doc.on("error", reject);
    doc.fontSize(10).fillColor("#111827").text(text, { width: 510, lineGap: 4 });
    doc.end();
  });
}
