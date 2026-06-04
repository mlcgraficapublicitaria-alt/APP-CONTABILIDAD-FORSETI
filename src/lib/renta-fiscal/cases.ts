import { type DataConfidence, type Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { maskNif } from "./security";

export function serializeTaxCase<T extends { taxpayerNif?: string | null }>(taxCase: T) {
  const { taxpayerNif, ...rest } = taxCase;
  return {
    ...rest,
    taxpayerNifMasked: maskNif(taxpayerNif),
  } as Omit<T, "taxpayerNif"> & { taxpayerNifMasked: string | null };
}

export function normalizeConfidence(value: unknown): DataConfidence {
  if (value === "CONFIRMED" || value === "ESTIMATED" || value === "PENDING") return value;
  if (value === "confirmed") return "CONFIRMED";
  if (value === "estimated") return "ESTIMATED";
  return "PENDING";
}

export async function getCaseOrNull(id: string) {
  return prisma.taxCase.findUnique({
    where: { id },
    include: {
      taxProfile: true,
      documents: { include: { requirement: true }, orderBy: { createdAt: "desc" } },
      dataPoints: { orderBy: { createdAt: "asc" } },
      issues: { orderBy: { createdAt: "desc" } },
      summary: true,
      auditEvents: { orderBy: { createdAt: "desc" } },
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function buildChecklist(taxCaseId: string) {
  const requirements = await prisma.documentRequirement.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      documents: {
        where: { taxCaseId },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return requirements.map((requirement) => {
    const latest = requirement.documents[0] ?? null;
    return {
      requirementId: requirement.id,
      code: requirement.code,
      label: requirement.label,
      description: requirement.description,
      required: requirement.required,
      status: latest?.status ?? "PENDING",
      document: latest,
    };
  });
}

export async function upsertSummary(taxCaseId: string) {
  const [checklist, issues, dataPoints] = await Promise.all([
    buildChecklist(taxCaseId),
    prisma.validationIssue.findMany({ where: { taxCaseId, status: "OPEN" } }),
    prisma.dataPoint.findMany({ where: { taxCaseId } }),
  ]);
  const missingCount = checklist.filter((item) => item.required && item.status === "PENDING").length;
  const confirmedCount = dataPoints.filter((item) => item.confidence === "CONFIRMED").length;
  const estimatedCount = dataPoints.filter((item) => item.confidence === "ESTIMATED").length;
  const pendingCount = dataPoints.filter((item) => item.confidence === "PENDING").length;
  const status: DataConfidence = missingCount === 0 && issues.length === 0 && pendingCount === 0 ? "CONFIRMED" : estimatedCount > 0 ? "ESTIMATED" : "PENDING";
  const preliminaryNotes = [
    "Resumen preliminar interno. No automatiza presentacion a terceros.",
    `${missingCount} documento(s) requerido(s) pendiente(s).`,
    `${issues.length} incidencia(s) abierta(s).`,
    `${confirmedCount} dato(s) confirmado(s), ${estimatedCount} estimado(s), ${pendingCount} pendiente(s).`,
  ].join(" ");

  return prisma.caseSummary.upsert({
    where: { taxCaseId },
    update: { status, preliminaryNotes, missingCount, issueCount: issues.length, confirmedCount, estimatedCount },
    create: { taxCaseId, status, preliminaryNotes, missingCount, issueCount: issues.length, confirmedCount, estimatedCount },
  });
}

export function taxCaseCreateData(input: {
  title?: string;
  taxpayerName?: string;
  taxpayerNif?: string;
  fiscalYear?: number;
  ownerId: string;
}): Prisma.TaxCaseCreateInput {
  const fiscalYear = Number.isInteger(input.fiscalYear) ? Number(input.fiscalYear) : new Date().getFullYear();
  const reference = `RF-${fiscalYear}-${Date.now().toString(36).toUpperCase()}`;
  return {
    reference,
    title: input.title?.trim() || "Nuevo expediente fiscal",
    taxpayerName: input.taxpayerName?.trim() || "Pendiente de identificar",
    taxpayerNif: input.taxpayerNif?.trim() || null,
    fiscalYear,
    owner: { connect: { id: input.ownerId } },
    taxProfile: { create: { confidence: "PENDING" } },
  };
}
