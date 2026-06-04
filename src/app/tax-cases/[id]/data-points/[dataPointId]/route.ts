import { prisma } from "@/lib/renta-fiscal/prisma";
import { badRequest, getIpAddress, notFound, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { normalizeConfidence, upsertSummary } from "@/lib/renta-fiscal/cases";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";

type Params = { params: Promise<{ id: string; dataPointId: string }> };
type PatchDataPointBody = {
  label?: string;
  value?: string | null;
  source?: string | null;
  confidence?: string;
};

export async function PATCH(request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id, dataPointId } = await context.params;
  const body = await readJson<PatchDataPointBody>(request);
  const existing = await prisma.dataPoint.findFirst({ where: { id: dataPointId, taxCaseId: id } });
  if (!existing) return notFound("Dato clave no encontrado.");
  if (body.label !== undefined && body.label.trim().length === 0) return badRequest("label no puede estar vacio.");

  const dataPoint = await prisma.dataPoint.update({
    where: { id: dataPointId },
    data: {
      label: body.label,
      value: body.value,
      source: body.source,
      confidence: body.confidence ? normalizeConfidence(body.confidence) : undefined,
    },
  });
  await upsertSummary(id);
  await writeAuditEvent({ userId: auth.user.id, taxCaseId: id, action: "update", entity: "DataPoint", entityId: dataPoint.id, ipAddress: getIpAddress(request) });
  return ok({ dataPoint });
}
