type TaxEntry = {
  direction: "PURCHASE" | "SALE";
  taxKind: string;
  baseCents: bigint;
  vatCents: bigint;
  vatRateBasisPoints: number | null;
  includedIn303: boolean;
};

const SELF_ASSESSED = new Set(["INTRA_EU", "INTRA_EU_GOODS", "INTRA_EU_SERVICES", "REVERSE_CHARGE"]);

export function calculateQuarterTaxes(entries: TaxEntry[]) {
  const sales = entries.filter((entry) => entry.direction === "SALE");
  const purchases = entries.filter((entry) => entry.direction === "PURCHASE");
  const sum = (source: TaxEntry[], field: "baseCents" | "vatCents") => source.reduce((total, entry) => total + entry[field], BigInt(0));
  const selfAssessedVat = purchases.filter((entry) => entry.includedIn303 && SELF_ASSESSED.has(entry.taxKind)).reduce((total, entry) => {
    if (entry.vatCents > BigInt(0)) return total + entry.vatCents;
    return total + (entry.vatRateBasisPoints ? entry.baseCents * BigInt(entry.vatRateBasisPoints) / BigInt(10000) : BigInt(0));
  }, BigInt(0));
  const outputVatCents = sum(sales.filter((entry) => entry.includedIn303), "vatCents") + selfAssessedVat;
  const inputVatCents = sum(purchases.filter((entry) => entry.includedIn303 && !SELF_ASSESSED.has(entry.taxKind)), "vatCents") + selfAssessedVat;
  const netIncomeCents = sum(sales, "baseCents") - sum(purchases, "baseCents");
  return {
    salesBaseCents: sum(sales, "baseCents"), purchasesBaseCents: sum(purchases, "baseCents"),
    outputVatCents, inputVatCents, result303Cents: outputVatCents - inputVatCents,
    netIncomeCents, provisional130Cents: netIncomeCents > BigInt(0) ? netIncomeCents * BigInt(20) / BigInt(100) : BigInt(0),
  };
}
