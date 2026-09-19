import type {
  AcceptanceCheck,
  AcceptanceResult,
  LedgerEntry,
  MoneyCents,
  QuarterClose,
  QuarterIssue,
} from "./types";

export function isMoneyCents(value: unknown): value is MoneyCents {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

export function calculateDifferenceCents(
  declaredResultCents: MoneyCents,
  calculatedResultCents?: MoneyCents,
): MoneyCents | undefined {
  if (calculatedResultCents === undefined) return undefined;
  return calculatedResultCents - declaredResultCents;
}

export function match349ToLedger(
  quarter: QuarterClose,
  anonymousCounterpartyId: string,
  amountCents: MoneyCents,
  operationType: "INTRA_EU_ACQUISITION" | "INTRA_EU_SUPPLY" = "INTRA_EU_ACQUISITION",
): LedgerEntry[] {
  const ledger = operationType === "INTRA_EU_SUPPLY" ? quarter.ledger.sales : quarter.ledger.purchases;
  return ledger.filter(
    (entry) =>
      (entry.kind === "INTRA_EU" || entry.kind === "INTRA_EU_GOODS" || entry.kind === "INTRA_EU_SERVICES") &&
      entry.includedIn349 &&
      entry.anonymousCounterpartyId === anonymousCounterpartyId &&
      entry.baseCents === amountCents &&
      getQuarter(entry.operationDate) === quarter.quarter &&
      Number(entry.operationDate.slice(0, 4)) === quarter.year,
  );
}

function getQuarter(operationDate: string): number {
  return Math.floor((Number(operationDate.slice(5, 7)) - 1) / 3) + 1;
}

export function findIssues(
  quarter: QuarterClose,
  code: QuarterIssue["code"],
): QuarterIssue[] {
  return quarter.issues.filter((issue) => issue.code === code);
}

function all349OperationsHaveConsumableMatches(quarter: QuarterClose): boolean {
  const operations = quarter.forms.m349?.declaredOperations ?? [];
  const eligibleEntries = [...quarter.ledger.purchases, ...quarter.ledger.sales].filter((entry) =>
    (entry.kind === "INTRA_EU" || entry.kind === "INTRA_EU_GOODS" || entry.kind === "INTRA_EU_SERVICES") &&
    entry.includedIn349 &&
    getQuarter(entry.operationDate) === quarter.quarter &&
    Number(entry.operationDate.slice(0, 4)) === quarter.year,
  );
  const consumed = new Set<string>();
  const everyDeclarationMatched = operations.every((operation) => {
    const matches = match349ToLedger(quarter, operation.anonymousCounterpartyId, operation.amountCents, operation.operationType)
      .filter((entry) => !consumed.has(entry.anonymousEntryId));
    if (matches.length !== 1) return false;
    consumed.add(matches[0].anonymousEntryId);
    return true;
  });
  return everyDeclarationMatched && consumed.size === eligibleEntries.length;
}

export function canBeReadyForReview(quarter: QuarterClose): boolean {
  const m303 = quarter.forms.m303;
  const hasBlocker = quarter.issues.some((issue) => issue.severity === "BLOCKER");
  const hasUnreconciledCalculation =
    m303?.calculatedResultCents !== undefined && m303.differenceCents !== 0;

  return quarter.importsCompleted === true && !hasBlocker && !hasUnreconciledCalculation;
}

export function getWorkflowPermissions(quarter: QuarterClose): {
  canImport: true;
  canSave: true;
  canMarkReadyForReview: boolean;
} {
  return {
    canImport: true,
    canSave: true,
    canMarkReadyForReview: canBeReadyForReview(quarter),
  };
}

function check(
  id: string,
  passed: boolean,
  expected: unknown,
  actual: unknown,
  message: string,
): AcceptanceCheck {
  return { id, verdict: passed ? "PASS" : "FAIL", expected, actual, message };
}

export function evaluateAcceptanceFixture(quarter: QuarterClose): AcceptanceResult {
  const checks: AcceptanceCheck[] = [];
  const m303 = quarter.forms.m303;
  const m349Operations = quarter.forms.m349?.declaredOperations ?? [];
  const m349Operation = m349Operations[0];
  const excludedIssues = findIssues(quarter, "DOMESTIC_PURCHASE_EXCLUDED_FROM_303");
  const exemptIssues = findIssues(quarter, "EXEMPT_OPERATION_REVIEW");
  const deferralIssues = findIssues(quarter, "DEFERRAL_PENDING");

  checks.push(
    check("303-declared", m303?.declaredResultCents === 122320, 122320, m303?.declaredResultCents, "El 303 declarado coincide con el oracle."),
    {
      id: "303-calculated",
      verdict: m303?.calculatedResultCents === undefined ? "NOT_EVALUATED" : "FAIL",
      expected: "NOT_EVALUATED",
      actual: m303?.calculatedResultCents,
      message: "El recálculo del 303 no se afirma sin desglose completo.",
    },
    check("303-deferral", m303?.paymentStatus === "PENDING_DEFERRAL", "PENDING_DEFERRAL", m303?.paymentStatus, "El aplazamiento permanece pendiente."),
    check("349-declared", m349Operation?.amountCents === 28550, 28550, m349Operation?.amountCents, "La cuantía declarada del 349 es exacta."),
    check(
      "349-unique-match",
      m349Operations.length > 0 && all349OperationsHaveConsumableMatches(quarter),
      m349Operations.length,
      all349OperationsHaveConsumableMatches(quarter) ? m349Operations.length : 0,
      "Todas las operaciones del 349 tienen una única correspondencia compatible en el libro y trimestre.",
    ),
    check("domestic-excluded-count", excludedIssues.length === 1, 1, excludedIssues.length, "El aviso doméstico está agrupado."),
    check("domestic-excluded-base", excludedIssues[0]?.baseCents === 71000, 71000, excludedIssues[0]?.baseCents, "La base excluida coincide."),
    check("domestic-excluded-vat", excludedIssues[0]?.vatCents === 14910, 14910, excludedIssues[0]?.vatCents, "El IVA excluido coincide."),
    check("exempt-review", exemptIssues.length === 1 && exemptIssues[0]?.amountCents === 3500, 3500, exemptIssues[0]?.amountCents, "La operación exenta requiere revisión."),
    check("deferral-blocker", deferralIssues.length === 1 && deferralIssues[0]?.severity === "BLOCKER", "BLOCKER", deferralIssues[0]?.severity, "El aplazamiento pendiente bloquea el avance."),
    check("quarter-status", quarter.status === "NEEDS_REVIEW" && !canBeReadyForReview(quarter), "NEEDS_REVIEW", quarter.status, "El trimestre no puede marcarse listo."),
  );

  return {
    verdict: checks.some((item) => item.verdict === "FAIL") ? "FAIL" : "PASS",
    checks,
  };
}
