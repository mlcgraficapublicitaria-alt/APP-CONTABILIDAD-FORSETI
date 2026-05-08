const SHEET_ID = "1C-4g6B4iiQzCuiWiDGi-YyTm1Tm5Z88bIrTOhlKSsQo";
const DEFAULT_MONTH = "MAYO 2026";

type DashboardData = {
  month: string;
  isDemoData: boolean;
  notice?: string;
  totalHours: string;
  totalFactura: string;
  totalNeto: string;
  netoConPasivos: string;
  beneficioNeto: string;
  ahorro: string;
  clientSummary: Array<{ client: string; actual: string; hours: string; prevision: string; previsionHours: string; diff: string }>;
};

const demoDashboardData: DashboardData = {
  month: DEFAULT_MONTH,
  isDemoData: true,
  notice: "No se pudo leer el Google Sheet publico. Mostrando datos de muestra para desarrollo local.",
  totalHours: "128 h",
  totalFactura: "12.480 EUR",
  totalNeto: "9.860 EUR",
  netoConPasivos: "8.940 EUR",
  beneficioNeto: "4.120 EUR",
  ahorro: "1.650 EUR",
  clientSummary: [
    { client: "MLC Design", actual: "4.820 EUR", hours: "48 h", prevision: "5.000 EUR", previsionHours: "50 h", diff: "-180 EUR" },
    { client: "Forseti", actual: "3.200 EUR", hours: "36 h", prevision: "3.100 EUR", previsionHours: "34 h", diff: "+100 EUR" },
    { client: "Soporte", actual: "2.460 EUR", hours: "28 h", prevision: "2.800 EUR", previsionHours: "32 h", diff: "-340 EUR" },
    { client: "Interno", actual: "2.000 EUR", hours: "16 h", prevision: "1.750 EUR", previsionHours: "14 h", diff: "+250 EUR" },
  ],
};

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (quoted) {
      if (char === "\"" && nextChar === "\"") {
        value += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  row.push(value);
  rows.push(row);

  return rows.filter((items) => items.some((item) => item.length > 0));
}

async function getRange(range: string) {
  const separatorIndex = range.lastIndexOf("!");
  const sheet = range.slice(0, separatorIndex);
  const cells = range.slice(separatorIndex + 1);
  const url = new URL(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheet);
  url.searchParams.set("range", cells);

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Public Sheets error: ${res.status}`);
  return parseCsv(await res.text());
}

function pick(row: string[] | undefined, index: number) {
  return row?.[index] ?? "—";
}

function findRow(rows: string[][], value: string) {
  return rows.find((row) => row.some((item) => item.trim().toUpperCase() === value.toUpperCase()));
}

function compactValues(row: string[] | undefined) {
  return row?.map((item) => item.trim()).filter(Boolean) ?? [];
}

function findColumnValue(rows: string[][], header: string, rowLabel: string) {
  const headerRow = rows.find((row) => row.some((item) => item.trim().toUpperCase() === header.toUpperCase()));
  const row = findRow(rows, rowLabel);
  const index = headerRow?.findIndex((item) => item.trim().toUpperCase() === header.toUpperCase()) ?? -1;

  if (index < 0) return "—";
  return pick(row, index);
}

export async function getDashboardData(month = DEFAULT_MONTH): Promise<DashboardData> {
  let summary: string[][];
  let finance: string[][];

  try {
    [summary, finance] = await Promise.all([
      getRange(`${month}!A15:H22`),
      getRange(`${month}!AA1:AV66`),
    ]);
  } catch {
    return { ...demoDashboardData, month };
  }

  const clientSummary = [1, 2, 4, 5].map((rowIndex) => {
    const row = summary[rowIndex];
    return {
      client: pick(row, 1),
      actual: pick(row, 2),
      hours: pick(row, 3),
      prevision: pick(row, 4),
      previsionHours: pick(row, 5),
      diff: pick(row, 6),
    };
  });
  const summaryTotalRow = findRow(summary, "TOTAL");
  const financeNetRow = finance.find((row) => row.includes(pick(summaryTotalRow, 3)));
  const financeNetValues = compactValues(financeNetRow);

  return {
    month,
    isDemoData: false,
    totalHours: pick(summaryTotalRow, 3),
    totalFactura: pick(summaryTotalRow, 2),
    totalNeto: financeNetValues[2] ?? "—",
    netoConPasivos: financeNetValues[3] ?? "—",
    beneficioNeto: findColumnValue(finance, "BENEFICIO NETO", "TOTAL"),
    ahorro: findColumnValue(finance, "AHORRO", "TOTAL"),
    clientSummary,
  };
}
