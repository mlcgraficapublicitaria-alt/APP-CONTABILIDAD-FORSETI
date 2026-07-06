import { NextRequest, NextResponse } from "next/server";
import { uploadHtmlDocumentToDrive } from "@/lib/drive-documents";
import { hasValidSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { folderId?: string; fileName?: string; html?: string };
    if (!body.folderId?.trim()) {
      return NextResponse.json({ error: "Selecciona una carpeta de Drive." }, { status: 400 });
    }
    if (!body.fileName?.trim()) {
      return NextResponse.json({ error: "Indica un nombre de archivo." }, { status: 400 });
    }
    if (!body.html?.trim()) {
      return NextResponse.json({ error: "No hay documento para guardar." }, { status: 400 });
    }

    const file = await uploadHtmlDocumentToDrive({
      folderId: body.folderId,
      fileName: body.fileName,
      html: body.html,
    });
    return NextResponse.json({ file });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el documento en Drive." },
      { status: 500 },
    );
  }
}
