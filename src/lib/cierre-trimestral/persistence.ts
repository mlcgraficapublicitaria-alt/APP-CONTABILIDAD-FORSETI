import { prisma } from "../renta-fiscal/prisma";
import { calculateDifferenceCents, isMoneyCents } from "./domain";
import { reconcileQuarterClosure } from "./reconciliation";
import type { LedgerEntry, QuarterClose } from "./types";

function assertMoney(value: unknown, field: string): asserts value is number {
  if (!isMoneyCents(value)) throw new TypeError(`${field} debe expresarse en céntimos enteros seguros.`);
}

function quarterForDate(value: string): number {
  return Math.floor((Number(value.slice(5, 7)) - 1) / 3) + 1;
}

export function mapLedgerEntryForPersistence(entry: LedgerEntry, year: number, quarter: number, expectedDirection: LedgerEntry["direction"]) {
  assertMoney(entry.baseCents, "baseCents");
  assertMoney(entry.vatCents, "vatCents");
  assertMoney(entry.totalCents, "totalCents");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.operationDate)) throw new TypeError("operationDate debe usar YYYY-MM-DD.");
  const operationDate = new Date(`${entry.operationDate}T00:00:00.000Z`);
  if (Number.isNaN(operationDate.getTime()) || operationDate.toISOString().slice(0, 10) !== entry.operationDate) {
    throw new TypeError("operationDate no es una fecha válida.");
  }
  if (Number(entry.operationDate.slice(0, 4)) !== year || quarterForDate(entry.operationDate) !== quarter) {
    throw new TypeError("operationDate no pertenece al trimestre.");
  }
  if (entry.direction !== expectedDirection) throw new TypeError("direction no coincide con el libro de origen.");
  if (entry.currency !== "EUR") throw new TypeError("currency debe ser EUR.");
  if (entry.totalCents !== entry.baseCents + entry.vatCents) throw new TypeError("totalCents debe coincidir con baseCents + vatCents.");
  if (entry.vatRateBasisPoints !== null && (!Number.isSafeInteger(entry.vatRateBasisPoints) || entry.vatRateBasisPoints < 0 || entry.vatRateBasisPoints > 10000)) {
    throw new TypeError("vatRateBasisPoints no es válido.");
  }
  if (entry.sourceRef?.sourceRow !== undefined && (!Number.isSafeInteger(entry.sourceRef.sourceRow) || entry.sourceRef.sourceRow < 1)) {
    throw new TypeError("sourceRow debe ser un entero positivo.");
  }

  return {
    anonymousEntryId: entry.anonymousEntryId,
    anonymousCounterpartyId: entry.anonymousCounterpartyId,
    operationDate,
    direction: entry.direction,
    documentType: entry.documentType,
    taxKind: entry.kind,
    currency: entry.currency,
    baseCents: BigInt(entry.baseCents),
    vatCents: BigInt(entry.vatCents),
    totalCents: BigInt(entry.totalCents),
    vatRateBasisPoints: entry.vatRateBasisPoints,
    includedIn303: entry.includedIn303,
    includedIn349: entry.includedIn349,
    reviewStatus: entry.reviewStatus,
    sourceFileId: entry.sourceRef?.sourceFileId,
    sourceSheet: entry.sourceRef?.sourceSheet,
    sourceRow: entry.sourceRef?.sourceRow,
  };
}

export function mapQuarterCloseForPersistence(quarter: QuarterClose) {
  if (!Number.isSafeInteger(quarter.year) || quarter.year < 2000 || quarter.year > 2200) throw new TypeError("year no es válido.");
  if (![1, 2, 3, 4].includes(quarter.quarter)) throw new TypeError("quarter no es válido.");
  if (quarter.status === "READY_FOR_REVIEW") {
    throw new TypeError("READY_FOR_REVIEW solo puede establecerse mediante markQuarterReadyForReview.");
  }
  const m303 = quarter.forms.m303;
  if (m303) {
    assertMoney(m303.declaredResultCents, "declared303ResultCents");
    if (m303.calculatedResultCents !== undefined) assertMoney(m303.calculatedResultCents, "calculated303ResultCents");
    if (m303.differenceCents !== undefined && !Number.isSafeInteger(m303.differenceCents)) {
      throw new TypeError("difference303Cents debe ser un entero seguro.");
    }
    const expectedDifference = calculateDifferenceCents(m303.declaredResultCents, m303.calculatedResultCents);
    if (m303.differenceCents !== expectedDifference) throw new TypeError("difference303Cents no coincide con calculado - declarado.");
  }

  const purchases = quarter.ledger.purchases.map((entry) => mapLedgerEntryForPersistence(entry, quarter.year, quarter.quarter, "PURCHASE"));
  const sales = quarter.ledger.sales.map((entry) => mapLedgerEntryForPersistence(entry, quarter.year, quarter.quarter, "SALE"));

  return {
    closure: {
      fiscalYear: quarter.year,
      quarter: quarter.quarter,
      status: quarter.status,
      declared303ResultCents: m303?.declaredResultCents === undefined ? undefined : BigInt(m303.declaredResultCents),
      calculated303ResultCents: m303?.calculatedResultCents === undefined ? undefined : BigInt(m303.calculatedResultCents),
      difference303Cents: m303?.differenceCents === undefined ? undefined : BigInt(m303.differenceCents),
      payment303Status: m303?.paymentStatus ?? ("UNKNOWN" as const),
    },
    operations349: (quarter.forms.m349?.declaredOperations ?? []).map((operation) => {
      assertMoney(operation.amountCents, "amountCents");
      return { ...operation, amountCents: BigInt(operation.amountCents) };
    }),
    entries: [...purchases, ...sales],
    issues: quarter.issues.map((issue) => {
      if (issue.amountCents !== undefined) assertMoney(issue.amountCents, "issue.amountCents");
      if (issue.baseCents !== undefined) assertMoney(issue.baseCents, "issue.baseCents");
      if (issue.vatCents !== undefined) assertMoney(issue.vatCents, "issue.vatCents");
      return {
      code: issue.code,
      severity: issue.severity,
      relatedAnonymousEntryIds: issue.relatedAnonymousEntryIds,
      amountCents: issue.amountCents === undefined ? undefined : BigInt(issue.amountCents),
      baseCents: issue.baseCents === undefined ? undefined : BigInt(issue.baseCents),
      vatCents: issue.vatCents === undefined ? undefined : BigInt(issue.vatCents),
      message: issue.message,
    }; }),
  };
}

export async function markQuarterReadyForReview(closureId: string) {
  return prisma.$transaction(async (tx) => {
    await reconcileQuarterClosure(tx, closureId);
    const closure = await tx.quarterlyClosure.findUniqueOrThrow({
      where: { id: closureId },
      include: { issues: true, importBatches: true },
    });
    const importsCompleted = closure.importBatches.length > 0 && closure.importBatches.every((batch) => batch.status === "CONFIRMED");
    const hasBlocker = closure.issues.some((issue) => issue.severity === "BLOCKER");
    const differenceReconciled = closure.calculated303ResultCents === null || closure.difference303Cents === BigInt(0);
    if (!importsCompleted || hasBlocker || !differenceReconciled) {
      throw new Error("El cierre no cumple los requisitos para READY_FOR_REVIEW.");
    }
    return tx.quarterlyClosure.update({ where: { id: closureId }, data: { status: "READY_FOR_REVIEW" } });
  });
}

export async function saveQuarterClose(taxCaseId: string, quarter: QuarterClose) {
  const mapped = mapQuarterCloseForPersistence(quarter);

  return prisma.$transaction(async (tx) => {
    const closure = await tx.quarterlyClosure.upsert({
      where: { taxCaseId_fiscalYear_quarter: { taxCaseId, fiscalYear: quarter.year, quarter: quarter.quarter } },
      create: { taxCaseId, ...mapped.closure },
      update: mapped.closure,
    });

    const importedEntries = await tx.quarterlyLedgerEntry.findMany({
      where: { closureId: closure.id, importBatchId: { not: null } },
      select: { anonymousEntryId: true },
    });
    const importedEntryIds = new Set(importedEntries.map((entry) => entry.anonymousEntryId));

    await Promise.all([
      tx.quarterlyLedgerEntry.deleteMany({ where: { closureId: closure.id, importBatchId: null } }),
      tx.quarterly349Operation.deleteMany({ where: { closureId: closure.id } }),
      tx.quarterlyIssue.deleteMany({ where: { closureId: closure.id } }),
    ]);

    const manualEntries = mapped.entries.filter((entry) => !importedEntryIds.has(entry.anonymousEntryId));
    if (manualEntries.length) await tx.quarterlyLedgerEntry.createMany({ data: manualEntries.map((entry) => ({ closureId: closure.id, ...entry })) });
    if (mapped.operations349.length) await tx.quarterly349Operation.createMany({ data: mapped.operations349.map((operation) => ({ closureId: closure.id, ...operation })) });
    await reconcileQuarterClosure(tx, closure.id);

    await tx.auditEvent.create({
      data: {
        taxCaseId,
        action: "QUARTERLY_CLOSURE_SAVED",
        entity: "QuarterlyClosure",
        entityId: closure.id,
        metadata: JSON.stringify({ fiscalYear: quarter.year, quarter: quarter.quarter, status: quarter.status }),
      },
    });

    return closure;
  });
}
