import { NextRequest, NextResponse } from "next/server";
import { searchDriveFolders } from "@/lib/drive-documents";
import { hasValidSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const folders = await searchDriveFolders(query);
    return NextResponse.json({ folders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron leer las carpetas de Drive." },
      { status: 500 },
    );
  }
}
