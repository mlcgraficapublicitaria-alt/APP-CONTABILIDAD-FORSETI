import { createHash } from "node:crypto";
import type { CsvMapping, ImportPreview, ImportPreviewRow } from "./import-types";
import type { LedgerEntry, TaxKind } from "./types";

export const DEFAULT_CSV_MAPPING: CsvMapping = {
  operationDate: "fecha", direction: "direccion", documentType: "tipo_documento",
  kind: "clase", currency: "moneda", base: "base", vat: "iva", total: "total", vatRate: "tipo_iva",
  anonymousCounterpartyId: "id_tercero", includedIn303: "incluido_303", includedIn349: "incluido_349",
};

type CsvRecord = { cells: string[]; sourceRow: number };

function parseRecords(content: string, delimiter: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let row = 1;
  let recordStart = 1;

  const finishRecord = () => {
    cells.push(cell.trim());
    if (cells.some((value) => value !== "")) records.push({ cells, sourceRow: recordStart });
    cells = [];
    cell = "";
    recordStart = row + 1;
  };

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '"') {
      if (quoted && content[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim()); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      finishRecord(); row += 1;
    } else {
      cell += char;
      if (char === "\n") row += 1;
    }
  }
  if (quoted) throw new TypeError("CSV con comillas sin cerrar.");
  if (cell !== "" || cells.length > 0) finishRecord();
  return records;
}

function detectDelimiter(header: string): "," | ";" | "\t" {
  const candidates = [",", ";", "\t"] as const;
  return candidates.reduce((best, candidate) => parseRecords(header, candidate)[0].cells.length > parseRecords(header, best)[0].cells.length ? candidate : best);
}

export function parseDecimalToCents(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new TypeError("Importe inválido; se esperan como máximo dos decimales.");
  const [units, decimals = ""] = normalized.split(".");
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new TypeError("Importe fuera del rango seguro.");
  return cents;
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "si", "sí", "yes"].includes(normalized)) return true;
  if (["0", "false", "no", ""].includes(normalized)) return false;
  throw new TypeError("Booleano inválido.");
}

function normalizeDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Fecha inválida; se espera YYYY-MM-DD.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new TypeError("Fecha inexistente.");
  return value;
}

function fingerprint(entry: Omit<LedgerEntry, "anonymousEntryId" | "reviewStatus" | "sourceRef">): string {
  return createHash("sha256").update(JSON.stringify(entry)).digest("hex");
}

function normalizeRow(raw: Record<string, string>, mapping: CsvMapping, sourceRow: number): { entry: LedgerEntry; fingerprint: string } {
  const direction = raw[mapping.direction]?.toUpperCase();
  const documentType = raw[mapping.documentType]?.toUpperCase();
  const kind = raw[mapping.kind]?.toUpperCase() as TaxKind;
  const allowedKinds: TaxKind[] = ["DOMESTIC", "INTRA_EU", "INTRA_EU_GOODS", "INTRA_EU_SERVICES", "REVERSE_CHARGE", "EXEMPT", "NOT_SUBJECT_LOCATION", "OTHER"];
  if (direction !== "PURCHASE" && direction !== "SALE") throw new TypeError("Dirección inválida.");
  if (documentType !== "INVOICE" && documentType !== "CREDIT_NOTE" && documentType !== "OTHER") throw new TypeError("Tipo documental inválido.");
  if (!allowedKinds.includes(kind)) throw new TypeError("Clase fiscal inválida.");
  const currency = raw[mapping.currency]?.trim().toUpperCase();
  if (!currency) throw new TypeError("La moneda debe declararse explícitamente.");
  if (currency !== "EUR") throw new TypeError("Moneda no soportada; este importador solo admite EUR.");
  const normalizedDirection: LedgerEntry["direction"] = direction;
  const normalizedDocumentType: LedgerEntry["documentType"] = documentType;
  const comparable = {
    anonymousCounterpartyId: raw[mapping.anonymousCounterpartyId]?.trim() || undefined,
    operationDate: normalizeDate(raw[mapping.operationDate] ?? ""),
    direction: normalizedDirection,
    documentType: normalizedDocumentType,
    kind,
    currency: currency as "EUR",
    baseCents: parseDecimalToCents(raw[mapping.base] ?? ""),
    vatCents: parseDecimalToCents(raw[mapping.vat] ?? ""),
    totalCents: parseDecimalToCents(raw[mapping.total] ?? ""),
    vatRateBasisPoints: raw[mapping.vatRate]?.trim() ? parseDecimalToCents(raw[mapping.vatRate]) : null,
    includedIn303: parseBoolean(raw[mapping.includedIn303] ?? ""),
    includedIn349: parseBoolean(raw[mapping.includedIn349] ?? ""),
  };
  if (comparable.totalCents !== comparable.baseCents + comparable.vatCents) throw new TypeError("El total no coincide con base + IVA.");
  const key = fingerprint(comparable);
  return { fingerprint: key, entry: {
    anonymousEntryId: `ENTRY-${key.slice(0, 16).toUpperCase()}`, ...comparable,
    reviewStatus: kind === "EXEMPT" || (kind === "DOMESTIC" && normalizedDirection === "PURCHASE" && !comparable.includedIn303) ? "REVIEW" : "OK",
    sourceRef: { sourceFileId: "PENDING", sourceRow },
  } };
}

export function previewCsv(content: string, mapping: CsvMapping = DEFAULT_CSV_MAPPING): ImportPreview {
  const normalizedContent = content.replace(/^\uFEFF/, "");
  const firstLine = normalizedContent.split(/\r?\n/, 1)[0];
  const delimiter = detectDelimiter(firstLine);
  const records = parseRecords(normalizedContent, delimiter);
  if (records.length < 2) throw new TypeError("El CSV debe incluir cabecera y al menos una fila.");
  const headers = records[0].cells;
  const missing = Object.values(mapping).filter((column) => !headers.includes(column));
  if (missing.length) throw new TypeError(`Faltan columnas requeridas: ${missing.join(", ")}`);
  const seen = new Set<string>();
  const rows: ImportPreviewRow[] = records.slice(1).map(({ cells: values, sourceRow }) => {
    const original = Object.fromEntries(headers.map((header, cellIndex) => [header, values[cellIndex] ?? ""]));
    try {
      if (values.length !== headers.length) throw new TypeError(`Número de celdas inválido: se esperaban ${headers.length} y se recibieron ${values.length}.`);
      const normalized = normalizeRow(original, mapping, sourceRow);
      const duplicate = seen.has(normalized.fingerprint);
      seen.add(normalized.fingerprint);
      return { sourceRow, original, normalized: normalized.entry, fingerprint: normalized.fingerprint, status: duplicate ? "DUPLICATE" : "VALID", errors: duplicate ? ["Fila duplicada dentro del fichero."] : [] };
    } catch (error) {
      return { sourceRow, original, fingerprint: createHash("sha256").update(JSON.stringify(values)).digest("hex"), status: "INVALID", errors: [error instanceof Error ? error.message : "Fila inválida."] };
    }
  });
  return { importerKey: "csv-ledger", importerVersion: "1", delimiter, mapping, rows, counts: {
    valid: rows.filter((row) => row.status === "VALID").length,
    invalid: rows.filter((row) => row.status === "INVALID").length,
    duplicate: rows.filter((row) => row.status === "DUPLICATE").length,
  } };
}
