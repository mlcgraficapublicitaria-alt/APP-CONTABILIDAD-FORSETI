import type { LedgerEntry } from "./types";

export type CsvColumn =
  | "operationDate"
  | "direction"
  | "documentType"
  | "kind"
  | "currency"
  | "base"
  | "vat"
  | "total"
  | "vatRate"
  | "anonymousCounterpartyId"
  | "includedIn303"
  | "includedIn349";

export type CsvMapping = Record<CsvColumn, string>;

export type ImportPreviewRow = {
  sourceRow: number;
  original: Record<string, string>;
  normalized?: LedgerEntry;
  fingerprint: string;
  status: "VALID" | "INVALID" | "DUPLICATE";
  errors: string[];
};

export type ImportPreview = {
  importerKey: "csv-ledger";
  importerVersion: "1";
  delimiter: "," | ";" | "\t";
  mapping: CsvMapping;
  rows: ImportPreviewRow[];
  counts: { valid: number; invalid: number; duplicate: number };
};
