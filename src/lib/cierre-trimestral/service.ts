import { prisma } from "@/lib/renta-fiscal/prisma";
import { reconcileQuarterClosure } from "./reconciliation";
import { calculateQuarterTaxes } from "./tax-calculation";

export async function ensureQuarterClosure(taxCaseId: string, fiscalYear: number, quarter: number, ownerId?: string) {
  const taxCase = await prisma.taxCase.findFirst({ where: { id: taxCaseId, ...(ownerId ? { ownerId } : {}) }, select: { id: true, fiscalYear: true } });
  if (!taxCase) throw new Error("Expediente fiscal no encontrado.");
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2020 || fiscalYear > 2200) throw new Error("Ejercicio no válido.");
  if (![1, 2, 3, 4].includes(quarter)) throw new Error("Trimestre no válido.");
  return prisma.quarterlyClosure.upsert({
    where: { taxCaseId_fiscalYear_quarter: { taxCaseId, fiscalYear, quarter } },
    create: { taxCaseId, fiscalYear, quarter },
    update: {},
  });
}

function number(value: bigint | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

export async function getQuarterSummary(closureId: string, ownerId?: string) {
  const closure = await prisma.quarterlyClosure.findFirst({
    where: { id: closureId, ...(ownerId ? { taxCase: { ownerId } } : {}) },
    include: {
      taxCase: { select: { id: true, title: true, taxpayerName: true, taxpayerNif: true } },
      ledgerEntries: { orderBy: { operationDate: "asc" } },
      operations349: true,
      issues: { orderBy: [{ severity: "desc" }, { createdAt: "asc" }] },
      importBatches: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!closure) throw new Error("Cierre trimestral no encontrado.");
  const calculated = calculateQuarterTaxes(closure.ledgerEntries);
  const intraEuEntries = closure.ledgerEntries.filter((entry) => entry.includedIn349 && entry.anonymousCounterpartyId);
  const operations349 = intraEuEntries.map((entry) => ({
    counterpartyId: entry.anonymousCounterpartyId!,
    operationType: entry.direction === "SALE" ? "INTRA_EU_SUPPLY" as const : "INTRA_EU_ACQUISITION" as const,
    amountCents: entry.baseCents,
  }));
  const grouped349 = new Map<string, (typeof operations349)[number]>();
  operations349.forEach((operation) => {
    const key = `${operation.operationType}:${operation.counterpartyId}`;
    const current = grouped349.get(key);
    grouped349.set(key, { ...operation, amountCents: (current?.amountCents ?? BigInt(0)) + operation.amountCents });
  });
  await prisma.$transaction(async (tx) => {
    await tx.quarterly349Operation.deleteMany({ where: { closureId: closure.id } });
    if (operations349.length) await tx.quarterly349Operation.createMany({ data: operations349.map((item) => ({
      closureId: closure.id, anonymousCounterpartyId: item.counterpartyId, operationType: item.operationType, amountCents: item.amountCents,
    })) });
    await tx.quarterlyClosure.update({ where: { id: closure.id }, data: { calculated303ResultCents: calculated.result303Cents } });
    await reconcileQuarterClosure(tx, closure.id);
  });
  const refreshedIssues = await prisma.quarterlyIssue.findMany({ where: { closureId: closure.id }, orderBy: [{ severity: "desc" }, { createdAt: "asc" }] });
  const refreshedClosure = await prisma.quarterlyClosure.findUniqueOrThrow({ where: { id: closure.id }, select: { status: true } });
  const blockers = refreshedIssues.filter((issue) => issue.severity === "BLOCKER").length;
  const invalidRows = closure.importBatches.reduce((total, batch) => total + batch.invalidRowCount, 0);
  return {
    id: closure.id, fiscalYear: closure.fiscalYear, quarter: closure.quarter, status: refreshedClosure.status,
    taxCase: closure.taxCase,
    totals: {
      salesBaseCents: Number(calculated.salesBaseCents), purchasesBaseCents: Number(calculated.purchasesBaseCents),
      outputVatCents: Number(calculated.outputVatCents), inputVatCents: Number(calculated.inputVatCents), result303Cents: Number(calculated.result303Cents),
      netIncomeCents: Number(calculated.netIncomeCents), provisional130Cents: Number(calculated.provisional130Cents), entries: closure.ledgerEntries.length,
    },
    form349: [...grouped349.values()].map((item) => ({ ...item, amountCents: Number(item.amountCents) })),
    issues: refreshedIssues.map((issue) => ({ ...issue, amountCents: number(issue.amountCents), baseCents: number(issue.baseCents), vatCents: number(issue.vatCents) })),
    checks: {
      importsConfirmed: closure.importBatches.length > 0 && closure.importBatches.every((batch) => batch.status === "CONFIRMED"),
      noInvalidRows: invalidRows === 0, noBlockers: blockers === 0,
      taxIdentityComplete: Boolean(closure.taxCase.taxpayerNif),
    },
    warnings: [
      "El modelo 130 mostrado es provisional: 20 % del rendimiento neto del trimestre, sin descontar retenciones, pagos previos ni ajustes acumulados.",
      "La clasificación fiscal de cada operación debe estar confirmada antes de presentar.",
    ],
  };
}
