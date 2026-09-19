import { describe, expect, it } from "vitest";
import { calculateQuarterTaxes } from "./tax-calculation";

describe("cálculo trimestral explicable", () => {
  it("calcula IVA doméstico y orientación de rendimiento", () => {
    const result = calculateQuarterTaxes([
      { direction: "SALE", taxKind: "DOMESTIC", baseCents: BigInt(100000), vatCents: BigInt(21000), vatRateBasisPoints: 2100, includedIn303: true },
      { direction: "PURCHASE", taxKind: "DOMESTIC", baseCents: BigInt(20000), vatCents: BigInt(4200), vatRateBasisPoints: 2100, includedIn303: true },
    ]);
    expect(result.result303Cents).toBe(BigInt(16800));
    expect(result.netIncomeCents).toBe(BigInt(80000));
    expect(result.provisional130Cents).toBe(BigInt(16000));
  });

  it("neutraliza la autorrepercusión deducible intracomunitaria", () => {
    const result = calculateQuarterTaxes([
      { direction: "PURCHASE", taxKind: "INTRA_EU_SERVICES", baseCents: BigInt(10000), vatCents: BigInt(0), vatRateBasisPoints: 2100, includedIn303: true },
    ]);
    expect(result.outputVatCents).toBe(BigInt(2100));
    expect(result.inputVatCents).toBe(BigInt(2100));
    expect(result.result303Cents).toBe(BigInt(0));
  });
});
