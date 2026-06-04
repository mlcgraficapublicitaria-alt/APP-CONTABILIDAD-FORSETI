import { buildChecklist } from "@/lib/renta-fiscal/cases";
import { notFound, ok, requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const exists = await prisma.taxCase.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return notFound("Expediente no encontrado.");
  return ok({ checklist: await buildChecklist(id) });
}
