import { NextResponse } from "next/server";
import { previewCsv } from "@/lib/cierre-trimestral/csv";
import { requireUser } from "@/lib/renta-fiscal/api";

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const file = (await request.formData()).get("file");
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
    const preview = previewCsv(await file.text());
    return NextResponse.json({ fileName: file.name, preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo analizar el CSV." },
      { status: 422 },
    );
  }
}
