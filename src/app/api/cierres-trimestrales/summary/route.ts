import { NextResponse } from "next/server";
import { requireUser } from "@/lib/renta-fiscal/api";
import { getQuarterSummary } from "@/lib/cierre-trimestral/service";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const closureId = new URL(request.url).searchParams.get("closureId")?.trim();
  if (!closureId) return NextResponse.json({ error: "Cierre no identificado." }, { status: 400 });
  try { return NextResponse.json({ summary: await getQuarterSummary(closureId, auth.user.id) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo calcular el cierre." }, { status: 422 }); }
}
