import { NextResponse } from "next/server";
import { requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";
import { confirmImportBatch } from "@/lib/cierre-trimestral/import-service";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = await request.json().catch(() => ({})) as { batchId?: string };
  if (!body.batchId?.trim()) return NextResponse.json({ error: "Lote no identificado." }, { status: 400 });
  try {
    const batch = await prisma.quarterlyImportBatch.findFirst({
      where: { id: body.batchId.trim(), closure: { taxCase: { ownerId: auth.user.id } } },
      select: { id: true },
    });
    if (!batch) return NextResponse.json({ error: "Lote no encontrado." }, { status: 404 });
    return NextResponse.json(await confirmImportBatch(body.batchId.trim()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo confirmar el lote." }, { status: 422 });
  }
}
