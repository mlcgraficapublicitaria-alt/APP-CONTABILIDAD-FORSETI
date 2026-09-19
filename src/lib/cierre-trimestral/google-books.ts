import { createHash } from "node:crypto";
import { getGoogleAccessToken, hasGoogleServiceAccountCredentials } from "../google-service-account";

export const BOOK_SHEETS = ["EXPEDIDAS", "RECIBIDAS"] as const;

export const BOOK_HEADERS = [
  "fecha", "direccion", "tipo_documento", "numero_factura", "nif_tercero", "nombre_tercero",
  "concepto", "clase", "moneda", "base", "tipo_iva", "iva", "total", "incluido_303", "incluido_349",
] as const;

const SHEETS_READ_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

type BookSheet = typeof BOOK_SHEETS[number];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function csvCell(value: string) {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function quarterForDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? Math.floor((Number(match[2]) - 1) / 3) + 1 : 0;
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  const spanish = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (spanish) return `${spanish[3]}-${spanish[2].padStart(2, "0")}-${spanish[1].padStart(2, "0")}`;
  return trimmed;
}

function requiredIndexes(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const aliases: Record<string, string[]> = {
    fecha: ["fecha", "fecha_expedicion", "fecha_operacion"], numero_factura: ["numero_factura", "numero", "factura"],
    nif_tercero: ["nif_tercero", "nif", "nif_destinatario", "nif_proveedor"], nombre_tercero: ["nombre_tercero", "nombre", "cliente_proveedor", "razon_social"],
    concepto: ["concepto", "descripcion"], clase: ["clase", "clase_fiscal", "tipo_operacion"], base: ["base", "base_imponible"],
    tipo_iva: ["tipo_iva", "iva_porcentaje"], iva: ["iva", "cuota_iva", "cuota_iva_soportada", "cuota_iva_repercutida"],
    total: ["total", "total_factura", "importe_total"], incluido_303: ["incluido_303"], incluido_349: ["incluido_349"],
    tipo_documento: ["tipo_documento"], moneda: ["moneda"],
  };
  return Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, names.map((name) => normalized.indexOf(name)).find((index) => index >= 0) ?? -1])) as Record<string, number>;
}

function value(row: string[], indexes: Record<string, number>, key: string, fallback = "") {
  const index = indexes[key];
  return index >= 0 ? (row[index] ?? "").trim() : fallback;
}

export async function readQuarterBooks(sheetId: string, year: number, quarter: number) {
  const canonicalRows: string[][] = [];
  const warnings: string[] = [];
  for (const sheet of BOOK_SHEETS) {
    const rows = await readBookRange(sheetId, `${sheet}!A1:AZ5000`);
    if (rows.length < 2) { warnings.push(`${sheet} no contiene movimientos.`); continue; }
    const indexes = requiredIndexes(rows[0]);
    const missing = ["fecha", "numero_factura", "nif_tercero", "nombre_tercero", "concepto", "base", "tipo_iva", "iva", "total"]
      .filter((field) => indexes[field] < 0);
    if (missing.length) throw new Error(`${sheet}: faltan columnas obligatorias: ${missing.join(", ")}.`);
    rows.slice(1).forEach((row) => {
      const date = normalizeDate(value(row, indexes, "fecha"));
      if (Number(date.slice(0, 4)) !== year || quarterForDate(date) !== quarter) return;
      const direction = sheet === "EXPEDIDAS" ? "SALE" : "PURCHASE";
      const kind = value(row, indexes, "clase", "DOMESTIC").toUpperCase();
      const thirdParty = value(row, indexes, "nif_tercero").replace(/\s+/g, "").toUpperCase();
      canonicalRows.push([
        date, direction, value(row, indexes, "tipo_documento", "INVOICE").toUpperCase(), kind,
        value(row, indexes, "moneda", "EUR").toUpperCase(), value(row, indexes, "base"), value(row, indexes, "iva"),
        value(row, indexes, "total"), value(row, indexes, "tipo_iva"),
        thirdParty ? createHash("sha256").update(thirdParty).digest("hex").slice(0, 24) : "",
        value(row, indexes, "incluido_303", "si"), value(row, indexes, "incluido_349", kind.startsWith("INTRA_EU") ? "si" : "no"),
        value(row, indexes, "numero_factura"), thirdParty, value(row, indexes, "nombre_tercero"), value(row, indexes, "concepto"), sheet,
      ]);
    });
  }
  const header = "fecha;direccion;tipo_documento;clase;moneda;base;iva;total;tipo_iva;id_tercero;incluido_303;incluido_349;numero_factura;nif_tercero;nombre_tercero;concepto;hoja_origen";
  return {
    content: [header, ...canonicalRows.map((row) => row.map(csvCell).join(";"))].join("\n"),
    rowCount: canonicalRows.length,
    warnings,
  };
}

async function readBookRange(sheetId: string, range: string) {
  if (!hasGoogleServiceAccountCredentials()) {
    throw new Error("FORSETI no tiene configurada la cuenta de servicio de Google necesaria para leer libros privados.");
  }
  const token = await getGoogleAccessToken([SHEETS_READ_SCOPE]);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await response.json() as { values?: unknown[][]; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "No se pudo leer el Google Sheet privado.");
  return (payload.values ?? []).map((row) => row.map((cell) => String(cell ?? "")));
}

export function templateRows() {
  return {
    headers: [...BOOK_HEADERS],
    examples: {
      EXPEDIDAS: ["2026-07-01", "SALE", "INVOICE", "A-001", "B00000000", "Cliente ejemplo", "Servicio profesional", "DOMESTIC", "EUR", "1000,00", "21", "210,00", "1210,00", "si", "no"],
      RECIBIDAS: ["2026-07-02", "PURCHASE", "INVOICE", "P-001", "B00000001", "Proveedor ejemplo", "Servicio necesario", "DOMESTIC", "EUR", "100,00", "21", "21,00", "121,00", "si", "no"],
    } satisfies Record<BookSheet, string[]>,
  };
}
