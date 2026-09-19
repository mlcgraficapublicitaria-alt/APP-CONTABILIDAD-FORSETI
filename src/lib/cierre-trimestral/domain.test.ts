import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/cierre-trimestral/1t-2026-anon.json";
import {
  canBeReadyForReview,
  calculateDifferenceCents,
  evaluateAcceptanceFixture,
  getWorkflowPermissions,
  isMoneyCents,
} from "./domain";
import { scanFixtureForPersonalData } from "./privacy";
import type { QuarterClose } from "./types";

const quarter = fixture as QuarterClose;

describe("contrato funcional del cierre trimestral", () => {
  it("acepta el oracle declarado sin inventar un resultado recalculado", () => {
    const result = evaluateAcceptanceFixture(quarter);

    expect(result.verdict).toBe("PASS");
    expect(result.checks.find((item) => item.id === "303-calculated")?.verdict).toBe("NOT_EVALUATED");
  });

  it("solo calcula diferencia cuando existe resultado calculado", () => {
    expect(calculateDifferenceCents(122320)).toBeUndefined();
    expect(calculateDifferenceCents(122320, 122320)).toBe(0);
    expect(calculateDifferenceCents(122320, 122321)).toBe(1);
  });

  it("permite importar y guardar con BLOCKER, pero no marcar listo", () => {
    expect(getWorkflowPermissions(quarter)).toEqual({
      canImport: true,
      canSave: true,
      canMarkReadyForReview: false,
    });
  });

  it("limita el dinero a céntimos enteros seguros", () => {
    expect(isMoneyCents(122320)).toBe(true);
    expect(isMoneyCents(12.5)).toBe(false);
    expect(isMoneyCents(-1)).toBe(false);
    expect(isMoneyCents(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });

  it("mantiene el fixture libre de PII y documentos fiscales", () => {
    expect(scanFixtureForPersonalData(fixture)).toEqual([]);
    expect(scanFixtureForPersonalData({ vatId: "ES00000000A" })).not.toEqual([]);
    expect(scanFixtureForPersonalData({ documentBase64: "data:application/pdf;base64,AA==" })).not.toEqual([]);
    expect(scanFixtureForPersonalData({ phone: "612345678" })).not.toEqual([]);
    expect(scanFixtureForPersonalData({ note: "Calle Mayor 12" })).not.toEqual([]);
    expect(scanFixtureForPersonalData({ anonymousEntryId: "REAL-123" })).not.toEqual([]);
  });

  it("exige importaciones completadas antes de READY_FOR_REVIEW", () => {
    const candidate = structuredClone(fixture) as QuarterClose;
    candidate.issues = [];
    candidate.forms.m303 = { declaredResultCents: 100, calculatedResultCents: 100, differenceCents: 0, paymentStatus: "PAID" };
    candidate.importsCompleted = false;
    expect(canBeReadyForReview(candidate)).toBe(false);
    candidate.importsCompleted = true;
    expect(canBeReadyForReview(candidate)).toBe(true);
  });

  it("valida todas las operaciones 349 y distingue adquisiciones de entregas", () => {
    const candidate = structuredClone(fixture) as QuarterClose;
    candidate.forms.m349!.declaredOperations.push({
      anonymousCounterpartyId: "EU-SUPPLIER-002",
      operationType: "INTRA_EU_SUPPLY",
      amountCents: 5000,
    });
    candidate.ledger.sales.push({
      anonymousEntryId: "ENTRY-EU-SALE-001",
      anonymousCounterpartyId: "EU-SUPPLIER-002",
      operationDate: "2026-03-10",
      direction: "SALE",
      documentType: "INVOICE",
      kind: "INTRA_EU",
      currency: "EUR",
      baseCents: 5000,
      vatCents: 0,
      totalCents: 5000,
      vatRateBasisPoints: 0,
      includedIn303: true,
      includedIn349: true,
      reviewStatus: "OK",
    });
    expect(evaluateAcceptanceFixture(candidate).checks.find((item) => item.id === "349-unique-match")?.verdict).toBe("PASS");
    candidate.ledger.sales[candidate.ledger.sales.length - 1].operationDate = "2026-04-01";
    expect(evaluateAcceptanceFixture(candidate).checks.find((item) => item.id === "349-unique-match")?.verdict).toBe("FAIL");
  });

  it("no reutiliza una misma línea del libro para dos operaciones 349", () => {
    const candidate = structuredClone(fixture) as QuarterClose;
    candidate.forms.m349!.declaredOperations.push(structuredClone(candidate.forms.m349!.declaredOperations[0]));
    expect(evaluateAcceptanceFixture(candidate).checks.find((item) => item.id === "349-unique-match")?.verdict).toBe("FAIL");
  });

  it("rechaza líneas 349 adicionales del libro sin declaración", () => {
    const candidate = structuredClone(fixture) as QuarterClose;
    const extra = structuredClone(candidate.ledger.purchases.find((entry) => entry.includedIn349)!);
    extra.anonymousEntryId = "ENTRY-EU-EXTRA";
    extra.anonymousCounterpartyId = "EU-SUPPLIER-EXTRA";
    candidate.ledger.purchases.push(extra);
    expect(evaluateAcceptanceFixture(candidate).checks.find((item) => item.id === "349-unique-match")?.verdict).toBe("FAIL");
  });
});
