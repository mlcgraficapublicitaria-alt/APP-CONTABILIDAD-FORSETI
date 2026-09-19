export type MoneyCents = number;

export type QuarterStatus = "DRAFT" | "NEEDS_REVIEW" | "READY_FOR_REVIEW";
export type PaymentStatus = "UNKNOWN" | "PENDING_DEFERRAL" | "PAID" | "DEBITED";
export type TaxKind =
  | "DOMESTIC"
  | "INTRA_EU"
  | "INTRA_EU_GOODS"
  | "INTRA_EU_SERVICES"
  | "REVERSE_CHARGE"
  | "EXEMPT"
  | "NOT_SUBJECT_LOCATION"
  | "OTHER";

export type LedgerEntry = {
  anonymousEntryId: string;
  anonymousCounterpartyId?: string;
  operationDate: string;
  direction: "PURCHASE" | "SALE";
  documentType: "INVOICE" | "CREDIT_NOTE" | "OTHER";
  kind: TaxKind;
  currency: "EUR";
  baseCents: MoneyCents;
  vatCents: MoneyCents;
  totalCents: MoneyCents;
  vatRateBasisPoints: number | null;
  includedIn303: boolean;
  includedIn349: boolean;
  reviewStatus: "OK" | "REVIEW";
  sourceRef?: {
    sourceFileId: string;
    sourceSheet?: string;
    sourceRow?: number;
  };
};

export type IssueCode =
  | "DOMESTIC_PURCHASE_EXCLUDED_FROM_303"
  | "EXEMPT_OPERATION_REVIEW"
  | "DEFERRAL_PENDING"
  | "FORM_LEDGER_MISMATCH";

export type QuarterIssue = {
  code: IssueCode;
  severity: "INFO" | "WARNING" | "BLOCKER";
  relatedAnonymousEntryIds: string[];
  amountCents?: MoneyCents;
  baseCents?: MoneyCents;
  vatCents?: MoneyCents;
  message: string;
};

export type QuarterClose = {
  schemaVersion: 1;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  status: QuarterStatus;
  importsCompleted?: boolean;
  forms: {
    m303?: {
      declaredResultCents: MoneyCents;
      calculatedResultCents?: MoneyCents;
      differenceCents?: MoneyCents;
      paymentStatus: PaymentStatus;
    };
    m349?: {
      declaredOperations: Array<{
        anonymousCounterpartyId: string;
        operationType: "INTRA_EU_ACQUISITION" | "INTRA_EU_SUPPLY";
        amountCents: MoneyCents;
      }>;
    };
  };
  ledger: {
    purchases: LedgerEntry[];
    sales: LedgerEntry[];
  };
  issues: QuarterIssue[];
  expectedTotals?: {
    declared303ResultCents: MoneyCents;
    intraEu349AmountCents: MoneyCents;
    excludedDomesticBaseCents: MoneyCents;
    excludedDomesticVatCents: MoneyCents;
    exemptAmountCents: MoneyCents;
  };
};

export type AcceptanceCheck = {
  id: string;
  verdict: "PASS" | "FAIL" | "NOT_EVALUATED";
  expected?: unknown;
  actual?: unknown;
  message: string;
};

export type AcceptanceResult = {
  verdict: "PASS" | "FAIL";
  checks: AcceptanceCheck[];
};
