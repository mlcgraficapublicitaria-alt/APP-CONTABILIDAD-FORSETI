const SHEET_ID = "1C-4g6B4iiQzCuiWiDGi-YyTm1Tm5Z88bIrTOhlKSsQo";
const DEFAULT_MONTH = "MAYO 2026";
const HOURS_PER_DAY_CELLS: Record<string, string> = {
  "MAYO 2026": "AF62",
};

const TOTAL_FACTURADO_CELLS: Record<string, string> = {
  "MAYO 2026": "AE65",
};

const PASSIVE_FORMULA_CELLS: Record<string, string> = {
  "ENERO 2026": "AJ62",
  "FEBRERO 2026": "AH57",
  "MARZO 2026": "AH62",
  "ABRIL 2026": "AH61",
  "MAYO 2026": "AH61",
  "JUNIO 2026": "AF60",
  "JULIO 2026": "AG63",
  "AGOSTO 2026": "AE60",
  "SEPTIEMBRE 2026": "AE60",
  "OCTUBRE 2026": "AF62",
  "NOVIEMBRE 2026": "AG60",
  "DICIEMBRE 2026": "AG62",
};

const PASSIVE_BREAKDOWN_RANGES: Record<string, string[]> = {
  "ENERO 2026": ["INGRESOS_PASIVOS!AH17:AK17", "INGRESOS_PASIVOS!AH19:AK19"],
  "MARZO 2026": ["CUPONES MANTENIMIENTO!G11:J11", "MARZO 2026!X66:AD66"],
  "MAYO 2026": ["INGRESOS_PASIVOS!AH16:AK16", "MAYO 2026!X15:AC15", "INGRESOS_PASIVOS!AH18:AK18"],
  "JULIO 2026": ["INGRESOS_PASIVOS!AH10:AK10"],
  "OCTUBRE 2026": [
    "INGRESOS_PASIVOS!AH19:AK19",
    "INGRESOS_PASIVOS!AH20:AK20",
    "INGRESOS_PASIVOS!AH22:AK22",
    "INGRESOS_PASIVOS!AH23:AK23",
    "INGRESOS_PASIVOS!AH24:AK24",
  ],
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
  ingresosPasivos: string;
  pasivosDetalle: Array<{ concepto: string; origen: string; importe: string }>;
  pasivosDetalleNota: string;
  gastosTotales: string;
  ivaTotal: string;
  beneficioNeto: string;
  ahorro: string;
  repartoBeneficio: {
    ahorro: string;
    inversion: string;
    ocio: string;
  };
  annualSavingsSummary: {
    year: string;
    totalProfit: string;
    totalSavings: string;
    totalInvestment: string;
    totalLeisure: string;
    averageSavings: string;
    entries: Array<{ month: string; profit: string; savings: string; investment: string; leisure: string }>;
  };
  clientSummary: Array<{ client: string; actual: string; hours: string; prevision: string; previsionHours: string; diff: string; diffHours: string }>;
  freelanceProjects: Array<{ client: string; project: string; price: string }>;
  annualIncomeHistory: Array<{
    year: string;
    total: string;
    average: string;
    comparison: string;
    monthlyComparison: string;
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
  ingresosPasivos: "—",
  pasivosDetalle: [],
  pasivosDetalleNota: "Desglose no disponible en datos de muestra.",
  gastosTotales: "3.200 EUR",
  ivaTotal: "540 EUR",
  beneficioNeto: "4.120 EUR",
  ahorro: "1.650 EUR",
  repartoBeneficio: {
    ahorro: "1.648 EUR",
    inversion: "1.236 EUR",
    ocio: "1.236 EUR",
  },
  annualSavingsSummary: {
    year: "2026",
    totalProfit: "15.045,88 €",
    totalSavings: "6.018,35 €",
    totalInvestment: "4.513,76 €",
    totalLeisure: "4.513,76 €",
    averageSavings: "501,53 €",
    entries: [
      { month: "ENERO", profit: "0 €", savings: "0 €", investment: "0 €", leisure: "0 €" },
      { month: "FEBRERO", profit: "0 €", savings: "0 €", investment: "0 €", leisure: "0 €" },
      { month: "MARZO", profit: "0 €", savings: "0 €", investment: "0 €", leisure: "0 €" },
      { month: "ABRIL", profit: "1.032 €", savings: "413 €", investment: "310 €", leisure: "310 €" },
      { month: "MAYO", profit: "2.003 €", savings: "801 €", investment: "601 €", leisure: "601 €" },
    ],
  },
  clientSummary: [
    { client: "MLC Design", actual: "4.820 EUR", hours: "48 h", prevision: "5.000 EUR", previsionHours: "50 h", diff: "-180 EUR", diffHours: "-2 h" },
    { client: "Forseti", actual: "3.200 EUR", hours: "36 h", prevision: "3.100 EUR", previsionHours: "34 h", diff: "+100 EUR", diffHours: "+2 h" },
    { client: "Soporte", actual: "2.460 EUR", hours: "28 h", prevision: "2.800 EUR", previsionHours: "32 h", diff: "-340 EUR", diffHours: "-4 h" },
    { client: "Interno", actual: "2.000 EUR", hours: "16 h", prevision: "1.750 EUR", previsionHours: "14 h", diff: "+250 EUR", diffHours: "+2 h" },
  ],
  freelanceProjects: [
    { client: "Cliente demo", project: "Proyecto demo", price: "180 EUR" },
  ],
  annualIncomeHistory: [
    {
      year: "2025",
      total: "29.557 EUR",
      average: "2.463 EUR",
      comparison: "-1.887 EUR",
      monthlyComparison: "-157 EUR",
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
  return value.trim().replace(/\s+/g, " ").toUpperCase();
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

function formatPassiveMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseMoneyOrNull(value: string) {
  if (!value || !isMoneyValue(value)) return null;

  const normalized = value.replace(/\s/g, "").replace("€", "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function subtractMoneyValues(total: string, base: string) {
  const totalAmount = parseMoneyOrNull(total);
  const baseAmount = parseMoneyOrNull(base);

  if (totalAmount === null || baseAmount === null) return "—";

  return formatPassiveMoney(totalAmount - baseAmount);
}

function normalizePassiveAmount(value: string) {
  const amount = parseMoneyOrNull(value);
  return amount === null ? value || "—" : formatPassiveMoney(amount);
}

function joinLabel(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(" · ") || "Pasivo";
}

function getSheetFromRange(range: string) {
  return range.slice(0, range.lastIndexOf("!"));
}

function getCellFromRange(range: string) {
  const cells = range.slice(range.lastIndexOf("!") + 1);
  return cells.split(":").at(-1) ?? cells;
}

function formatRangeOrigin(range: string) {
  return `${getSheetFromRange(range)}!${getCellFromRange(range)}`;
}

function buildPassiveItem(range: string, row: string[]) {
  const sheet = getSheetFromRange(range);

  if (sheet === "INGRESOS_PASIVOS") {
    return {
      concepto: joinLabel([pick(row, 0), pick(row, 2)]),
      origen: formatRangeOrigin(range),
      importe: normalizePassiveAmount(pick(row, 3)),
    };
  }

  if (sheet === "CUPONES MANTENIMIENTO") {
    return {
      concepto: joinLabel([pick(row, 1), "Cupon mantenimiento"]),
      origen: formatRangeOrigin(range),
      importe: normalizePassiveAmount(pick(row, 3)),
    };
  }

  return {
    concepto: joinLabel([sheet, "Ajuste de pasivos"]),
    origen: formatRangeOrigin(range),
    importe: normalizePassiveAmount(row.findLast((value) => parseMoneyOrNull(value) !== null) ?? "—"),
  };
}

async function getPassiveBreakdown(month: string, totalPassive: string) {
  const formulaCell = PASSIVE_FORMULA_CELLS[month];
  const ranges = PASSIVE_BREAKDOWN_RANGES[month] ?? [];

  if (ranges.length === 0) {
    return {
      note: "Mes sin pasivos desglosados actualmente.",
      items: [],
    };
  }

  try {
    const rows = await Promise.all(ranges.map((range) => getRange(range)));
    const items = rows
      .map((rangeRows, index) => buildPassiveItem(ranges[index], rangeRows[0] ?? []))
      .filter((item) => parseMoneyOrNull(item.importe) !== null && parseMoneyOrNull(item.importe) !== 0);
    const totalAmount = parseMoneyOrNull(totalPassive);
    const listedAmount = items.reduce((sum, item) => sum + (parseMoneyOrNull(item.importe) ?? 0), 0);
    const missingAmount = totalAmount === null ? 0 : totalAmount - listedAmount;

    if (Math.abs(missingAmount) >= 0.01) {
      items.push({
        concepto: "Otros pasivos o ajustes incluidos en la formula",
        origen: formulaCell ? `${month}!${formulaCell}` : month,
        importe: formatPassiveMoney(missingAmount),
      });
    }

    return {
      note: `Desglose de pasivos mes de ${month}.`,
      items,
    };
  } catch {
    return {
      note: formulaCell
        ? `Columna MAS INGRESOS PASIVOS localizada en ${month}!${formulaCell}; no se pudo leer el desglose.`
        : "Total calculado por diferencia. No se pudo leer el desglose rastreado para este mes.",
      items: [],
    };
  }
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

async function getTotalFacturado(month: string, monthlyRows: string[][], fallback: string) {
  const cell = TOTAL_FACTURADO_CELLS[month];

  if (cell) {
    try {
      const value = pick((await getRange(`${month}!${cell}:${cell}`))[0], 0);
      if (value !== "—") return value;
    } catch {
      return fallback;
    }
  }

  const totalFacturado = findFirstColumnValue(monthlyRows, ["TOTAL INGRESOS BRUTOS", "INGRESOS BRUTOS", "TOTAL BRUTOS"], "TOTAL");
  return totalFacturado !== "—" ? totalFacturado : fallback;
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

function findColumnValue(rows: string[][], header: string, rowLabel: string, fallbackToColumnTotal = false) {
  const headerRowIndex = rows.findIndex((row) => row.some((item) => normalize(item) === normalize(header)));
  const headerRow = rows[headerRowIndex];
  const row = findRow(rows, rowLabel);
  const index = headerRow?.findIndex((item) => normalize(item) === normalize(header)) ?? -1;

  if (index < 0) return "—";

  const labeledValue = row?.[index]?.trim();
  if (labeledValue) return labeledValue;
  if (!fallbackToColumnTotal) return "—";

  return rows
    .slice(headerRowIndex + 1)
    .map((item) => item[index]?.trim() ?? "")
    .filter((value) => isMoneyValue(value))
    .at(-1) ?? "—";
}

function findFirstColumnValue(rows: string[][], headers: string[], rowLabel: string) {
  for (const header of headers) {
    const value = findColumnValue(rows, header, rowLabel);
    if (value !== "—") return value;
  }

  return "—";
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

function findAnnualSavingsSummary(rows: string[][]) {
  const year = rows.flatMap((row) => row.map((item) => item.trim())).find((item) => /^\d{4}$/.test(item)) ?? "2026";
  const entries = rows
    .map((row) => {
      const monthIndex = row.findIndex((item) => MONTH_NAMES.includes(normalize(item)));
      if (monthIndex < 0) return null;

      return {
        month: normalize(row[monthIndex]),
        profit: pick(row, monthIndex + 1),
        savings: pick(row, monthIndex + 2),
        investment: pick(row, monthIndex + 4),
        leisure: pick(row, monthIndex + 6),
      };
    })
    .filter((item): item is { month: string; profit: string; savings: string; investment: string; leisure: string } => item !== null);
  const totalRow = rows.find((row) => row.some((item) => normalize(item) === "TOTAL"));
  const totalIndex = totalRow?.findIndex((item) => normalize(item) === "TOTAL") ?? -1;
  const totalSavings = totalIndex >= 0 ? pick(totalRow, totalIndex + 2) : formatMoney(entries.reduce((sum, entry) => sum + parseMoney(entry.savings), 0));
  const averageSavings = entries.length > 0 ? formatMoney(parseMoney(totalSavings) / entries.length) : "—";

  return {
    year,
    totalProfit: totalIndex >= 0 ? pick(totalRow, totalIndex + 1) : formatMoney(entries.reduce((sum, entry) => sum + parseMoney(entry.profit), 0)),
    totalSavings,
    totalInvestment: totalIndex >= 0 ? pick(totalRow, totalIndex + 4) : formatMoney(entries.reduce((sum, entry) => sum + parseMoney(entry.investment), 0)),
    totalLeisure: totalIndex >= 0 ? pick(totalRow, totalIndex + 6) : formatMoney(entries.reduce((sum, entry) => sum + parseMoney(entry.leisure), 0)),
    averageSavings,
    entries,
  };
}

function findFreelanceProjects(rows: string[][]) {
  const headerRowIndex = rows.findIndex((row) => row.some((item) => normalize(item) === "CLIENTE") && row.some((item) => normalize(item) === "TRABAJOS"));
  const headerRow = rows[headerRowIndex];

  if (!headerRow) return [];

  const clientIndex = headerRow.findIndex((item) => normalize(item) === "CLIENTE");
  const projectIndex = headerRow.findIndex((item) => normalize(item) === "TRABAJOS");

  return rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const client = row[clientIndex]?.trim() ?? "";
      const project = row[projectIndex]?.trim() ?? "";
      const price = row.slice(projectIndex + 1).find((value) => isMoneyValue(value) && parseMoney(value) > 0)?.trim() ?? "";

      return { client, project, price };
    })
    .filter((item) => item.client && item.project && item.price);
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
    monthlyComparison: string;
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
        monthlyComparison: "—",
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
    } else if (label.startsWith("COMPARACION MENSUAL")) {
      currentYear.monthlyComparison = value;
    }
  }

  return years.filter((item) => item.entries.length > 0 || item.total !== "—");
}

export async function getDashboardData(month = DEFAULT_MONTH): Promise<DashboardData> {
  let summary: string[][];
  let finance: string[][];
  let incomeSplit: string[][];
  let annualIncomeHistoryRows: string[][];
  let monthlyRows: string[][];

  try {
    [summary, finance, incomeSplit, annualIncomeHistoryRows, monthlyRows] = await Promise.all([
      getRange(`${month}!A10:H80`),
      getRange(`${month}!AA1:AZ90`),
      getRange("REPARTO INGRESOS!A1:Z80"),
      getRange("SEGUIMIENTO INGRESOS!A1:Z140"),
      getRange(`${month}!A1:AV90`),
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
  const totalNeto = netValues[0] ?? "—";
  const netoConPasivos = netValues[1] ?? totalNeto;
  const ingresosPasivos = subtractMoneyValues(netoConPasivos, totalNeto);
  const pasivosBreakdown = await getPassiveBreakdown(month, ingresosPasivos);
  const totalFacturado = await getTotalFacturado(month, monthlyRows, pick(summaryTotalRow, 2));

  return {
    month,
    isDemoData: false,
    totalHours: pick(summaryTotalRow, 3),
    hoursPerDay: await getHoursPerDay(month, finance),
    totalFactura: totalFacturado,
    totalNeto,
    netoConPasivos,
    ingresosPasivos,
    pasivosDetalle: pasivosBreakdown.items,
    pasivosDetalleNota: pasivosBreakdown.note,
    gastosTotales: findTotalExpenses(finance),
    ivaTotal: findColumnValue(finance, "TOTAL IVA", "TOTAL", true),
    beneficioNeto: findColumnValue(finance, "BENEFICIO NETO", "TOTAL", true),
    ahorro: findColumnValue(finance, "AHORRO", "TOTAL", true),
    repartoBeneficio: findIncomeSplit(incomeSplit, month),
    annualSavingsSummary: findAnnualSavingsSummary(incomeSplit),
    clientSummary,
    freelanceProjects: findFreelanceProjects(monthlyRows),
    annualIncomeHistory: findAnnualIncomeHistory(annualIncomeHistoryRows),
  };
}
