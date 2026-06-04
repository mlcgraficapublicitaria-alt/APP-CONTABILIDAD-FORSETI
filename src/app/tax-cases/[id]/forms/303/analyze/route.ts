import { getIpAddress, notFound, ok, requireUser } from "@/lib/renta-fiscal/api";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";
import { analyzeModel303Pdf } from "@/lib/renta-fiscal/model-303-analysis";
import { prisma } from "@/lib/renta-fiscal/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;
  const taxCase = await prisma.taxCase.findUnique({ where: { id }, include: { taxProfile: true } });
  if (!taxCase) return notFound("Expediente no encontrado.");

  const formData = await request.formData();
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Sube un PDF del modelo 303 para analizarlo." }, { status: 400 });
  }

  const analysis = await analyzeModel303Pdf(await file.arrayBuffer(), taxCase.taxProfile);

  await writeAuditEvent({
    userId: auth.user.id,
    taxCaseId: id,
    action: "analyze_model_303",
    entity: "TaxCase",
    entityId: id,
    metadata: { documento: "Modelo 303", resultado: "Analisis preliminar" },
    ipAddress: getIpAddress(request),
  });

  return ok({ analysis });
}
