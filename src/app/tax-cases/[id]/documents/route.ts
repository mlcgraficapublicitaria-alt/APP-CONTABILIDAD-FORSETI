import { prisma } from "@/lib/renta-fiscal/prisma";
import { badRequest, getIpAddress, notFound, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { buildChecklist, upsertSummary } from "@/lib/renta-fiscal/cases";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";

type Params = { params: Promise<{ id: string }> };
type CreateDocumentBody = {
  requirementId?: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  notes?: string;
};

export async function GET(_request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const documents = await prisma.document.findMany({
    where: { taxCaseId: id },
    orderBy: { createdAt: "desc" },
    include: { requirement: true, uploadedBy: { select: { id: true, name: true, email: true } } },
  });
  return ok({ documents });
}

export async function POST(request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const { id } = await context.params;
  const body = await readJson<CreateDocumentBody>(request);
  const exists = await prisma.taxCase.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return notFound("Expediente no encontrado.");
  if (!body.fileName) return badRequest("fileName es obligatorio.");

  const document = await prisma.document.create({
    data: {
      taxCaseId: id,
      requirementId: body.requirementId,
      fileName: body.fileName,
      mimeType: body.mimeType ?? "application/octet-stream",
      sizeBytes: Number(body.sizeBytes ?? 0),
      storageKey: body.storageKey ?? `stub/${id}/${Date.now()}-${body.fileName}`,
      notes: body.notes,
      uploadedById: auth.user.id,
    },
  });
  await upsertSummary(id);
  await writeAuditEvent({ userId: auth.user.id, taxCaseId: id, action: "upload_stub", entity: "Document", entityId: document.id, ipAddress: getIpAddress(request) });
  return ok({ document, checklist: await buildChecklist(id) }, { status: 201 });
}
