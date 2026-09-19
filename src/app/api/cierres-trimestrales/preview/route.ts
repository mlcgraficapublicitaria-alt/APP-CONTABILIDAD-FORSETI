import { NextResponse } from "next/server";
import { previewCsv } from "@/lib/cierre-trimestral/csv";
import { createCsvImportPreview } from "@/lib/cierre-trimestral/import-service";
import { ensureQuarterClosure } from "@/lib/cierre-trimestral/service";
import { requireUser } from "@/lib/renta-fiscal/api";

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: "Adjunta un CSV para generar la vista previa." }, { status: 400 });
  }
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "El CSV no puede superar 2 MB." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "En esta fase solo se admiten archivos CSV." }, { status: 415 });
  }

  try {
    const content = Buffer.from(await file.arrayBuffer());
    const taxCaseId = String(formData.get("taxCaseId") ?? "").trim();
    const fiscalYear = Number(formData.get("year"));
    const quarter = Number(formData.get("quarter"));
    if (taxCaseId) {
      const closure = await ensureQuarterClosure(taxCaseId, fiscalYear, quarter, auth.user.id);
      const imported = await createCsvImportPreview({ closureId: closure.id, fileName: file.name, mimeType: file.type || "text/csv", content });
      return NextResponse.json({ fileName: file.name, closureId: closure.id, ...imported });
    }
    const preview = previewCsv(content.toString("utf8"));
    return NextResponse.json({ fileName: file.name, preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo analizar el CSV." },
      { status: 422 },
    );
  }
}
