import { NextResponse } from "next/server";
import { requireUser } from "@/lib/renta-fiscal/api";
import { createCsvImportPreview } from "@/lib/cierre-trimestral/import-service";
import { readQuarterBooks } from "@/lib/cierre-trimestral/google-books";
import { ensureQuarterClosure } from "@/lib/cierre-trimestral/service";

type Body = { taxCaseId?: string; sheetId?: string; fiscalYear?: number; quarter?: number };

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = await request.json().catch(() => ({})) as Body;
  const taxCaseId = body.taxCaseId?.trim();
  const sheetId = body.sheetId?.trim() || process.env.QUARTERLY_BOOKS_SHEET_ID?.trim();
  const fiscalYear = Number(body.fiscalYear);
  const quarter = Number(body.quarter);
  if (!taxCaseId || !sheetId) return NextResponse.json({ error: "Selecciona expediente e indica el ID del Google Sheet de libros." }, { status: 400 });
  try {
    const closure = await ensureQuarterClosure(taxCaseId, fiscalYear, quarter, auth.user.id);
    const books = await readQuarterBooks(sheetId, fiscalYear, quarter);
    if (!books.rowCount) return NextResponse.json({ error: `No hay movimientos de ${quarter}T/${fiscalYear} en EXPEDIDAS o RECIBIDAS.` }, { status: 422 });
    const imported = await createCsvImportPreview({
      closureId: closure.id,
      fileName: `google-sheets-${fiscalYear}-${quarter}T.csv`, mimeType: "text/csv",
      content: Buffer.from(books.content, "utf8"), storageKey: `google-sheets:${sheetId}:${fiscalYear}:${quarter}`,
    });
    return NextResponse.json({ closureId: closure.id, ...imported, warnings: books.warnings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron leer los libros." }, { status: 422 });
  }
}
