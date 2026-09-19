import { Prisma } from "@prisma/client";

const RECONCILED_ISSUE_CODES = [
  "DOMESTIC_PURCHASE_EXCLUDED_FROM_303",
  "EXEMPT_OPERATION_REVIEW",
  "DEFERRAL_PENDING",
  "FORM_LEDGER_MISMATCH",
] as const;

export async function reconcileQuarterClosure(tx: Prisma.TransactionClient, closureId: string) {
  const closure = await tx.quarterlyClosure.findUniqueOrThrow({
    where: { id: closureId },
    include: { ledgerEntries: true, operations349: true },
  });
  const domesticExcluded = closure.ledgerEntries.filter((entry) =>
    entry.direction === "PURCHASE" && entry.taxKind === "DOMESTIC" && entry.vatCents > BigInt(0) && !entry.includedIn303);
  const exempt = closure.ledgerEntries.filter((entry) => entry.taxKind === "EXEMPT");
  const intraEuKinds = new Set(["INTRA_EU", "INTRA_EU_GOODS", "INTRA_EU_SERVICES"]);
  const form349Counts = new Map<string, number>();
  const ledger349Counts = new Map<string, number>();
  const key349 = (direction: string, counterparty: string | null, amount: bigint) => `${direction}|${counterparty ?? ""}|${amount}`;

  for (const operation of closure.operations349) {
    const direction = operation.operationType === "INTRA_EU_SUPPLY" ? "SALE" : "PURCHASE";
    const key = key349(direction, operation.anonymousCounterpartyId, operation.amountCents);
    form349Counts.set(key, (form349Counts.get(key) ?? 0) + 1);
  }
  for (const entry of closure.ledgerEntries.filter((candidate) => candidate.includedIn349 && intraEuKinds.has(candidate.taxKind))) {
    const key = key349(entry.direction, entry.anonymousCounterpartyId, entry.baseCents);
    ledger349Counts.set(key, (ledger349Counts.get(key) ?? 0) + 1);
  }
  const mismatched349Keys = new Set([...form349Counts.keys(), ...ledger349Counts.keys()].filter(
    (key) => form349Counts.get(key) !== ledger349Counts.get(key),
  ));
  const mismatched349EntryIds = closure.ledgerEntries
    .filter((entry) => entry.includedIn349 && intraEuKinds.has(entry.taxKind) &&
      mismatched349Keys.has(key349(entry.direction, entry.anonymousCounterpartyId, entry.baseCents)))
    .map((entry) => entry.anonymousEntryId);

  await tx.quarterlyIssue.deleteMany({ where: { closureId, code: { in: [...RECONCILED_ISSUE_CODES] } } });
  const issues: Prisma.QuarterlyIssueCreateManyInput[] = [];
  if (domesticExcluded.length) issues.push({
    closureId, code: "DOMESTIC_PURCHASE_EXCLUDED_FROM_303", severity: "WARNING",
    relatedAnonymousEntryIds: domesticExcluded.map((entry) => entry.anonymousEntryId),
    baseCents: domesticExcluded.reduce((total, entry) => total + entry.baseCents, BigInt(0)),
    vatCents: domesticExcluded.reduce((total, entry) => total + entry.vatCents, BigInt(0)),
    message: "Revisar compras domésticas con IVA no incluidas en el 303.",
  });
  if (exempt.length) issues.push({
    closureId, code: "EXEMPT_OPERATION_REVIEW", severity: "WARNING",
    relatedAnonymousEntryIds: exempt.map((entry) => entry.anonymousEntryId),
    amountCents: exempt.reduce((total, entry) => total + entry.totalCents, BigInt(0)),
    message: "Revisar tratamiento y soporte de las operaciones exentas.",
  });
  if (closure.payment303Status === "PENDING_DEFERRAL") issues.push({
    closureId, code: "DEFERRAL_PENDING", severity: "BLOCKER", relatedAnonymousEntryIds: [],
    amountCents: closure.declared303ResultCents,
    message: "El aplazamiento del 303 sigue pendiente de resolución.",
  });
  if (mismatched349Keys.size) issues.push({
    closureId, code: "FORM_LEDGER_MISMATCH", severity: "BLOCKER", relatedAnonymousEntryIds: mismatched349EntryIds,
    message: "El modelo 349 y el libro del trimestre no tienen correspondencia bidireccional exacta.",
  });
  if (issues.length) await tx.quarterlyIssue.createMany({ data: issues });
  await tx.quarterlyClosure.update({
    where: { id: closureId },
    data: { status: issues.length ? "NEEDS_REVIEW" : "DRAFT" },
  });
  return issues;
}
