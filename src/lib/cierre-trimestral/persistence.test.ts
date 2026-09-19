import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/cierre-trimestral/1t-2026-anon.json";
import { mapQuarterCloseForPersistence } from "./persistence";
import type { QuarterClose } from "./types";

describe("persistencia del cierre trimestral", () => {
  it("mapea el fixture canónico sin mezclar declarado, calculado y diferencia", () => {
    const mapped = mapQuarterCloseForPersistence(fixture as QuarterClose);

    expect(mapped.closure).toMatchObject({
      fiscalYear: 2026,
      quarter: 1,
      status: "NEEDS_REVIEW",
      declared303ResultCents: BigInt(122320),
      calculated303ResultCents: undefined,
      difference303Cents: undefined,
      payment303Status: "PENDING_DEFERRAL",
    });
    expect(mapped.operations349).toHaveLength(1);
    expect(mapped.entries).toHaveLength(4);
    expect(mapped.issues.some((issue) => issue.code === "DEFERRAL_PENDING" && issue.severity === "BLOCKER")).toBe(true);
  });

  it("rechaza importes fraccionarios antes de escribir", () => {
    const invalid = structuredClone(fixture) as QuarterClose;
    invalid.ledger.purchases[0].baseCents = 12.5;

    expect(() => mapQuarterCloseForPersistence(invalid)).toThrow(/céntimos enteros seguros/);
  });

  it.each([
    ["fecha inexistente", (value: QuarterClose) => { value.ledger.purchases[0].operationDate = "2026-02-30"; }],
    ["fecha fuera del trimestre", (value: QuarterClose) => { value.ledger.purchases[0].operationDate = "2026-04-01"; }],
    ["dirección discordante", (value: QuarterClose) => { value.ledger.purchases[0].direction = "SALE"; }],
    ["total incoherente", (value: QuarterClose) => { value.ledger.purchases[0].totalCents += 1; }],
  ])("rechaza %s antes de escribir", (_label, mutate) => {
    const invalid = structuredClone(fixture) as QuarterClose;
    mutate(invalid);
    expect(() => mapQuarterCloseForPersistence(invalid)).toThrow();
  });

  it("rechaza diferencia 303 que no coincide con declarado y calculado", () => {
    const invalid = structuredClone(fixture) as QuarterClose;
    invalid.forms.m303 = {
      declaredResultCents: 100,
      calculatedResultCents: 120,
      differenceCents: 19,
      paymentStatus: "UNKNOWN",
    };
    expect(() => mapQuarterCloseForPersistence(invalid)).toThrow(/calculado - declarado/);
  });

  it("no permite persistir READY_FOR_REVIEW por una vía que omita las comprobaciones", () => {
    const invalid = structuredClone(fixture) as QuarterClose;
    invalid.status = "READY_FOR_REVIEW";
    expect(() => mapQuarterCloseForPersistence(invalid)).toThrow(/markQuarterReadyForReview/);
  });
});
