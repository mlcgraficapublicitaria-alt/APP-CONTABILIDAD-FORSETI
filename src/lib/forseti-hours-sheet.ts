import type { AuditClient, DayHours, WorkSegment } from "./forseti-hours-types";

const SHEET_ID = "1C-4g6B4iiQzCuiWiDGi-YyTm1Tm5Z88bIrTOhlKSsQo";
const SHEETS_READ_TIMEOUT_MS = 12_000;

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

    if (char === "\"") quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") value += char;
  }

  row.push(value);
  rows.push(row);
  return rows.filter((items) => items.some((item) => item.trim()));
}

export async function getSheetRange(sheet: string, range: string) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`);
  url.searchParams.set("tqx", "out:csv");
  url.searchParams.set("sheet", sheet);
  url.searchParams.set("range", range);

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(SHEETS_READ_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`No se pudo leer el Sheet: ${res.status}`);
  return parseCsv(await res.text());
}

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`;
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function parseDurationMinutes(value: string) {
  const match = value.trim().match(/^(-?\d+):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const sign = match[1].startsWith("-") ? -1 : 1;
  return sign * (Math.abs(Number(match[1])) * 60 + Number(match[2]));
}

function normalizeClient(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase();
}

function clientAliases(client: AuditClient) {
  const aliases: Record<AuditClient, string[]> = {
    "SPANISH-CHEESE": ["SPANISH-CHEESE", "SPANISH CHEESE", "SPANISHCHEESE"],
    "GRUPO DIM": ["GRUPO DIM", "GRUPODIM"],
    MLCDESIGN: ["MLCDESIGN", "MLC DESIGN", "MLC DESING"],
  };
  return aliases[client].map(normalizeClient);
}

function makeSegment(startValue: string, endValue: string): WorkSegment | null {
  const start = parseTime(startValue);
  const end = parseTime(endValue);
  if (!start || !end) return null;
  if (start === "00:00" && end === "00:00") return null;
  if (timeToMinutes(end) <= timeToMinutes(start)) return null;
  return { start, end, minutes: timeToMinutes(end) - timeToMinutes(start) };
}

function isEmptySecondLine(row: string[]) {
  return row.every((cell) => !cell.trim() || cell.trim() === "0:00:00");
}

export async function readSheetMonthHours(month: string): Promise<DayHours[]> {
  const rows = await getSheetRange(month, "A1:AV90");
  const days: DayHours[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowDate = parseDate(row[9] ?? "");
    if (!rowDate) continue;

    const dayRows = [row];
    const nextRow = rows[index + 1];
    if (nextRow && !parseDate(nextRow[9] ?? "")) dayRows.push(nextRow);

    const holiday = dayRows.some((dayRow) => dayRow.some((cell) => cell.trim().toUpperCase() === "FESTIVO"));
    const segments = dayRows.flatMap(readWorkSegmentsFromRow);

    if (!segments.length && !holiday && dayRows.every(isEmptySecondLine)) continue;

    days.push({
      date: rowDate,
      segments: [],
      totalMinutes: 0,
      holiday,
      source: "sheet" as const,
    });
    const day = days[days.length - 1];
    day.segments.push(...segments);
    day.totalMinutes = day.segments.reduce((sum, segment) => sum + segment.minutes, 0);
  }

  return days.filter((day) => day.holiday || day.segments.length > 0);
}

function readWorkSegmentsFromRow(row: string[]) {
  const segmentColumnPairs = [
    [14, 15],
    [17, 18],
    [20, 21],
  ] as const;

  return segmentColumnPairs
    .map(([startIndex, endIndex]) => makeSegment(row[startIndex] ?? "", row[endIndex] ?? ""))
    .filter((segment): segment is WorkSegment => segment !== null);
}

export async function readSheetClientTotalMinutes(month: string, client: AuditClient): Promise<number> {
  const rows = await getSheetRange(month, "A1:H90");
  const aliases = clientAliases(client);

  for (const row of rows) {
    const normalizedCells = row.map(normalizeClient);
    if (!normalizedCells.some((cell) => aliases.includes(cell))) continue;

    const duration = row.map(parseDurationMinutes).find((minutes) => minutes !== null);
    if (duration !== undefined && duration !== null) return duration;
  }

  return 0;
}
