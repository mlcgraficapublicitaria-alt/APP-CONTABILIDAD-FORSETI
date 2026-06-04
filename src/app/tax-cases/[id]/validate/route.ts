import { getIpAddress, notFound, ok, requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";
import { validateTaxCase } from "@/lib/renta-fiscal/validation";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const exists = await prisma.taxCase.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return notFound("Expediente no encontrado.");
  const result = await validateTaxCase(id);
  await writeAuditEvent({ userId: auth.user.id, taxCaseId: id, action: "validate", entity: "TaxCase", entityId: id, ipAddress: getIpAddress(request) });
  return ok(result);
}
