const SHEET_ID = "1C-4g6B4iiQzCuiWiDGi-YyTm1Tm5Z88bIrTOhlKSsQo";
const DEFAULT_MONTH = "MAYO 2026";
const HOURS_PER_DAY_CELLS: Record<string, string> = {
  "MAYO 2026": "AF62",
};

type DashboardData = {
  month: string;
  isDemoData: boolean;
  notice?: string;
  totalHours: string;
  hoursPerDay: string;
  totalFactura: string;
  totalNeto: string;
  netoConPasivos: string;
  gastosTotales: string;
  ivaTotal: string;
  beneficioNeto: string;
  ahorro: string;
  repartoBeneficio: {
    ahorro: string;
    inversion: string;
    ocio: string;
  };
  clientSummary: Array<{ client: string; actual: string; hours: string; prevision: string; previsionHours: string; diff: string; diffHours: string }>;
  annualIncomeHistory: Array<{
    year: string;
    total: string;
    average: string;
    comparison: string;
    entries: Array<{ month: string; value: string }>;
  }>;
};

const demoDashboardData: DashboardData = {
  month: DEFAULT_MONTH,
  isDemoData: true,
  notice: "No se pudo leer el Google Sheet publico. Mostrando datos de muestra para desarrollo local.",
  totalHours: "128 h",
  hoursPerDay: "6:24:00",
  totalFactura: "12.480 EUR",
  totalNeto: "9.860 EUR",
  netoConPasivos: "8.940 EUR",
  gastosTotales: "3.200 EUR",
  ivaTotal: "540 EUR",
  beneficioNeto: "4.120 EUR",
  ahorro: "1.650 EUR",
  repartoBeneficio: {
    ahorro: "1.648 EUR",
    inversion: "1.236 EUR",
    ocio: "1.236 EUR",
  },
  clientSummary: [
    { client: "MLC Design", actual: "4.820 EUR", hours: "48 h", prevision: "5.000 EUR", previsionHours: "50 h", diff: "-180 EUR", diffHours: "-2 h" },
    { client: "Forseti", actual: "3.200 EUR", hours: "36 h", prevision: "3.100 EUR", previsionHours: "34 h", diff: "+100 EUR", diffHours: "+2 h" },
    { client: "Soporte", actual: "2.460 EUR", hours: "28 h", prevision: "2.800 EUR", previsionHours: "32 h", diff: "-340 EUR", diffHours: "-4 h" },
    { client: "Interno", actual: "2.000 EUR", hours: "16 h", prevision: "1.750 EUR", previsionHours: "14 h", diff: "+250 EUR", diffHours: "+2 h" },
  ],
  annualIncomeHistory: [
    {
      year: "2025",
      total: "29.557 EUR",
      average: "2.463 EUR",
      comparison: "-1.887 EUR",
      entries: [
        { month: "ENERO", value: "2.497 EUR" },
        { month: "FEBRERO", value: "2.527 EUR" },
      ],
    },
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

function normalize(value: string) {
  return value.trim().toUpperCase();
}

function isMoneyValue(value: string) {
  return value.includes("€") || /^\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(value.trim());
}

function isTimeValue(value: string) {
  return /^\d+:\d{2}(?::\d{2})?$/.test(value.trim());
}

function parseMoney(value: string) {
  const normalized = value.replace(/\s/g, "").replace("€", "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseTimeToSeconds(value: string) {
  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":");
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function formatSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimeToMinutes(value: string) {
  if (!isTimeValue(value)) return value;

  const [hours = "0", minutes = "0"] = value.split(":");
  return `${Number(hours)}:${minutes.padStart(2, "0")}`;
}

function findHoursPerDay(rows: string[][]) {
  const netHeaderRowIndex = rows.findIndex((row) => row.some((item) => normalize(item) === "TOTAL INGRESOS NETOS"));
  if (netHeaderRowIndex < 0) return "—";

  const netHeaderIndex = rows[netHeaderRowIndex].findIndex((item) => normalize(item) === "TOTAL INGRESOS NETOS");
  const dailyHoursIndex = netHeaderIndex - 1;
  const totalIndex = rows.findIndex((row, index) => index > netHeaderRowIndex && row.some((item) => normalize(item) === "DIFERENCIA MES PASADO"));
  const rowsUntilTotal = totalIndex >= 0 ? rows.slice(netHeaderRowIndex + 1, totalIndex) : rows.slice(netHeaderRowIndex + 1);
  const dailySeconds = rowsUntilTotal
    .filter((row) => !(row[netHeaderIndex]?.trim() || row[netHeaderIndex + 1]?.trim()))
    .map((row) => row[dailyHoursIndex] ?? "")
    .filter((value) => isTimeValue(value) && parseTimeToSeconds(value) > 0)
    .map(parseTimeToSeconds);

  if (dailySeconds.length === 0) return "—";

  const totalSeconds = dailySeconds.reduce((sum, seconds) => sum + seconds, 0);
  return formatSeconds(Math.round(totalSeconds / dailySeconds.length));
}

async function getHoursPerDay(month: string, finance: string[][]) {
  const cell = HOURS_PER_DAY_CELLS[month];

  if (!cell) return findHoursPerDay(finance);

  try {
    return formatTimeToMinutes(pick((await getRange(`${month}!${cell}:${cell}`))[0], 0));
  } catch {
    return findHoursPerDay(finance);
  }
}

function findSummaryRows(rows: string[][]) {
  const headerIndex = rows.findIndex((row) => {
    const values = row.map(normalize);
    return values.includes("ACTUAL") && values.some((item) => item.startsWith("PREVISIÓN")) && values.some((item) => item.startsWith("DIFERENCIA"));
  });
  const firstDataIndex =
    headerIndex >= 0
      ? headerIndex + 1
      : rows.findIndex((row) => row[1]?.trim() && (isMoneyValue(row[2] ?? "") || isTimeValue(row[3] ?? "")));
  const startIndex = Math.max(firstDataIndex, 0);
  const totalIndex = rows.findIndex((row, index) => index >= startIndex && normalize(row[1] ?? "").startsWith("TOTAL"));
  const dataRows = totalIndex >= 0 ? rows.slice(startIndex, totalIndex) : rows.slice(startIndex);
  const clientRows = dataRows.filter((row) => {
    const label = normalize(row[1] ?? "");
    if (!label || label.startsWith("TOTAL")) return false;
    if (isMoneyValue(row[1] ?? "") || isTimeValue(row[1] ?? "")) return false;
    return [2, 3, 4, 5, 6].some((index) => {
      const value = row[index] ?? "";
      return isMoneyValue(value) || isTimeValue(value);
    });
  });
  const totalMoney = clientRows.reduce((sum, row) => sum + parseMoney(row[2] ?? ""), 0);
  const totalSeconds = clientRows.reduce((sum, row) => sum + parseTimeToSeconds(row[3] ?? "0:00:00"), 0);

  return {
    clientRows,
    totalRow: totalIndex >= 0 ? rows[totalIndex] : ["", "TOTAL", formatMoney(totalMoney), formatSeconds(totalSeconds)],
  };
}

function findValuesBelowHeader(rows: string[][], header: string) {
  const headerRowIndex = rows.findIndex((row) => row.some((item) => normalize(item) === normalize(header)));
  if (headerRowIndex < 0) return [];

  const headerIndex = rows[headerRowIndex].findIndex((item) => normalize(item) === normalize(header));
  const values: string[] = [];

  for (const row of rows.slice(headerRowIndex + 1)) {
    const value = row[headerIndex]?.trim();
    const adjacentValue = row[headerIndex + 1]?.trim();

    if (value && isMoneyValue(value)) values.push(value);
    if (adjacentValue && isMoneyValue(adjacentValue)) values.push(adjacentValue);
  }

  return values;
}

function findColumnValue(rows: string[][], header: string, rowLabel: string) {
  const headerRow = rows.find((row) => row.some((item) => normalize(item) === normalize(header)));
  const row = findRow(rows, rowLabel);
  const index = headerRow?.findIndex((item) => normalize(item) === normalize(header)) ?? -1;

  if (index < 0) return "—";
  return pick(row, index);
}

function findTotalExpenses(rows: string[][]) {
  const totalRow = findRow(rows, "TOTAL");
  const totalIndex = totalRow?.findIndex((item) => normalize(item) === "TOTAL") ?? -1;

  if (!totalRow || totalIndex < 0) return "—";
  return pick(totalRow, totalIndex + 1);
}

function findIncomeSplit(rows: string[][], month: string) {
  const monthName = month.split(" ")[0] ?? month;
  const row = rows.find((items) => items.some((item) => normalize(item) === normalize(monthName)));
  const monthIndex = row?.findIndex((item) => normalize(item) === normalize(monthName)) ?? -1;

  if (!row || monthIndex < 0) {
    return {
      ahorro: "—",
      inversion: "—",
      ocio: "—",
    };
  }

  return {
    ahorro: pick(row, monthIndex + 2),
    inversion: pick(row, monthIndex + 4),
    ocio: pick(row, monthIndex + 6),
  };
}

const MONTH_NAMES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

function findAnnualIncomeHistory(rows: string[][]) {
  const years: Array<{
    year: string;
    total: string;
    average: string;
    comparison: string;
    entries: Array<{ month: string; value: string }>;
  }> = [];
  let currentYear: (typeof years)[number] | undefined;

  for (const row of rows) {
    const label = normalize(row[4] ?? "");
    const value = row[5]?.trim() || "—";

    if (/^\d{4}$/.test(label)) {
      currentYear = {
        year: label,
        total: "—",
        average: "—",
        comparison: "—",
        entries: [],
      };
      years.push(currentYear);
      continue;
    }

    if (!currentYear) continue;

    if (MONTH_NAMES.includes(label) && value !== "—") {
      currentYear.entries.push({ month: label, value });
    } else if (label === "TOTAL") {
      currentYear.total = value;
    } else if (label === "INGRESOS MEDIOS/MES") {
      currentYear.average = value;
    } else if (label.startsWith("COMPARACION ANUAL")) {
      currentYear.comparison = value;
    }
  }

  return years.filter((item) => item.entries.length > 0 || item.total !== "—");
}

export async function getDashboardData(month = DEFAULT_MONTH): Promise<DashboardData> {
  let summary: string[][];
  let finance: string[][];
  let incomeSplit: string[][];
  let annualIncomeHistoryRows: string[][];

  try {
    [summary, finance, incomeSplit, annualIncomeHistoryRows] = await Promise.all([
      getRange(`${month}!A10:H80`),
      getRange(`${month}!AA1:AV66`),
      getRange("REPARTO INGRESOS!A1:Z80"),
      getRange("SEGUIMIENTO INGRESOS!A1:Z140"),
    ]);
  } catch {
    return { ...demoDashboardData, month };
  }

  const { clientRows, totalRow: summaryTotalRow } = findSummaryRows(summary);
  const clientSummary = clientRows.map((row) => {
    return {
      client: pick(row, 1),
      actual: pick(row, 2),
      hours: pick(row, 3),
      prevision: pick(row, 4),
      previsionHours: pick(row, 5),
      diff: pick(row, 6),
      diffHours: pick(row, 7),
    };
  });
  const netValues = findValuesBelowHeader(finance, "TOTAL INGRESOS NETOS");

  return {
    month,
    isDemoData: false,
    totalHours: pick(summaryTotalRow, 3),
    hoursPerDay: await getHoursPerDay(month, finance),
    totalFactura: pick(summaryTotalRow, 2),
    totalNeto: netValues[0] ?? "—",
    netoConPasivos: netValues[1] ?? netValues[0] ?? "—",
    gastosTotales: findTotalExpenses(finance),
    ivaTotal: findColumnValue(finance, "TOTAL IVA", "TOTAL"),
    beneficioNeto: findColumnValue(finance, "BENEFICIO NETO", "TOTAL"),
    ahorro: findColumnValue(finance, "AHORRO", "TOTAL"),
    repartoBeneficio: findIncomeSplit(incomeSplit, month),
    clientSummary,
    annualIncomeHistory: findAnnualIncomeHistory(annualIncomeHistoryRows),
  };
}
