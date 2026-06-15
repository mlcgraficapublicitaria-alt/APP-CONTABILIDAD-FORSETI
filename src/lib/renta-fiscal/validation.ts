import { prisma } from "./prisma";
import { buildChecklist, upsertSummary } from "./cases";

type DataPointLike = {
  confidence: "CONFIRMED" | "ESTIMATED" | "PENDING";
};

export async function validateTaxCase(taxCaseId: string) {
  const [taxCase, checklist, dataPoints] = await Promise.all([
    prisma.taxCase.findUnique({ where: { id: taxCaseId }, include: { taxProfile: true } }),
    buildChecklist(taxCaseId),
    prisma.dataPoint.findMany({ where: { taxCaseId } }),
  ]);

  if (!taxCase) throw new Error("Expediente no encontrado.");

  await prisma.validationIssue.deleteMany({ where: { taxCaseId, status: "OPEN" } });

  const issueData = [];
  for (const item of checklist) {
    if (item.required && item.status === "PENDING") {
      issueData.push({
        taxCaseId,
        code: `missing_document_${item.code}`,
        title: `Falta ${item.label}`,
        description: `Documento requerido pendiente: ${item.description}`,
        severity: "WARNING" as const,
      });
    }
  }

  if (!taxCase.taxpayerNif) {
    issueData.push({
      taxCaseId,
      code: "missing_taxpayer_nif",
      title: "NIF/NIE pendiente",
      description: "El expediente no tiene identificador fiscal confirmado.",
      severity: "ERROR" as const,
    });
  }

  if (dataPoints.length === 0 || dataPoints.some((item: DataPointLike) => item.confidence === "PENDING")) {
    issueData.push({
      taxCaseId,
      code: "pending_data_points",
      title: "Datos clave pendientes",
      description: "Existen datos clave sin confirmar. No se deben inventar importes ni condiciones fiscales.",
      severity: "WARNING" as const,
    });
  }

  if (issueData.length > 0) {
    await prisma.validationIssue.createMany({ data: issueData });
  }

  const issues = await prisma.validationIssue.findMany({ where: { taxCaseId, status: "OPEN" }, orderBy: { createdAt: "desc" } });
  const summary = await upsertSummary(taxCaseId);
  return { issues, summary };
}
