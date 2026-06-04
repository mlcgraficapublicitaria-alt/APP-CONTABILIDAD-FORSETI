import { prisma } from "@/lib/renta-fiscal/prisma";
import { badRequest, getIpAddress, notFound, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { normalizeConfidence, upsertSummary } from "@/lib/renta-fiscal/cases";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";

type Params = { params: Promise<{ id: string }> };
type CreateDataPointBody = {
  key: string;
  label: string;
  value?: string;
  source?: string;
  confidence?: string;
};

export async function POST(request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const body = await readJson<CreateDataPointBody>(request);
  const exists = await prisma.taxCase.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return notFound("Expediente no encontrado.");
  if (!body.key || !body.label) return badRequest("key y label son obligatorios.");

  const dataPoint = await prisma.dataPoint.upsert({
    where: { taxCaseId_key: { taxCaseId: id, key: body.key } },
    update: {
      label: body.label,
      value: body.value,
      source: body.source,
      confidence: normalizeConfidence(body.confidence),
    },
    create: {
      taxCaseId: id,
      key: body.key,
      label: body.label,
      value: body.value,
      source: body.source,
      confidence: normalizeConfidence(body.confidence),
    },
  });
  await upsertSummary(id);
  await writeAuditEvent({ userId: auth.user.id, taxCaseId: id, action: "upsert", entity: "DataPoint", entityId: dataPoint.id, ipAddress: getIpAddress(request) });
  return ok({ dataPoint }, { status: 201 });
}
