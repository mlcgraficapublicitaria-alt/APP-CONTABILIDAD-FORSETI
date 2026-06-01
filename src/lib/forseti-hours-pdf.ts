import { join } from "path";
import { pathToFileURL } from "url";
import type { DayHours, WorkSegment } from "./forseti-hours-types";

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[–—]/g, "-")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function makeSegment(start: string, end: string): WorkSegment {
  return { start, end, minutes: Math.max(0, timeToMinutes(end) - timeToMinutes(start)) };
}

function dateKey(day: string, month: string, year: string) {
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

export async function extractPdfHours(buffer: ArrayBuffer, month: string): Promise<DayHours[]> {
  const positionedDays = await extractPositionedHours(buffer, month);
  if (positionedDays.length > 0) return positionedDays;

  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href);
  const parser = new PDFParse({ data: Buffer.from(buffer) });
  const tableDays = await extractTableHours(parser, month);
  if (tableDays.length > 0) {
    await parser.destroy();
    return tableDays;
  }

  const parsed = await parser.getText({
    cellSeparator: " ",
    itemJoiner: " ",
    lineEnforce: true,
    pageJoiner: "\n",
  });
  await parser.destroy();

  const text = normalizeText(parsed.text);
  const [, monthName = "", year = "2026"] = month.match(/^(\S+)\s+(\d{4})$/) ?? [];
  const monthNumber = getMonthNumber(monthName);

  if (!monthNumber) throw new Error(`No se pudo resolver el mes ${month}`);

  const dayMap = new Map<string, DayHours>();
  const datePattern = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/g;
  const matches = [...text.matchAll(datePattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const day = match[1];
    const parsedMonth = match[2];
    const parsedYear = match[3].length === 2 ? `20${match[3]}` : match[3];
    if (Number(parsedMonth) !== monthNumber || parsedYear !== year) continue;

    const startIndex = match.index ?? 0;
    const endIndex = matches[index + 1]?.index ?? Math.min(text.length, startIndex + 520);
    const chunk = text.slice(startIndex, endIndex);
    const segments = extractSegments(chunk);
    const key = dateKey(day, parsedMonth, parsedYear);
    const holiday = /festivo|holiday/i.test(chunk);

    if (!segments.length && !holiday) continue;

    dayMap.set(key, {
      date: key,
      segments,
      totalMinutes: segments.reduce((sum, segment) => sum + segment.minutes, 0),
      holiday,
      source: "pdf",
    });
  }

  if (dayMap.size === 0) {
    const fallbackDays = extractLooseRows(text, monthNumber, year);
    fallbackDays.forEach((day) => dayMap.set(day.date, day));
  }

  return [...dayMap.values()];
}

export async function extractPdfDebugRows(buffer: ArrayBuffer, month: string): Promise<string[]> {
  try {
    const positionedRows = await extractPositionedRows(buffer);
    const [, monthName = "", year = "2026"] = month.match(/^(\S+)\s+(\d{4})$/) ?? [];
    const monthNumber = getMonthNumber(monthName);
    if (!monthNumber) return positionedRows.slice(0, 80);

    return positionedRows
      .filter((row, index, rows) => {
        const hasMonthDate = parseDateFromText(row, monthNumber, year);
        const hasTime = /\b([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/.test(row);
        const previousHasDate = index > 0 ? parseDateFromText(rows[index - 1], monthNumber, year) : null;
        return Boolean(hasMonthDate || (hasTime && previousHasDate));
      })
      .slice(0, 120);
  } catch {
    return [];
  }
}

async function extractPositionedHours(buffer: ArrayBuffer, month: string): Promise<DayHours[]> {
  const [, monthName = "", year = "2026"] = month.match(/^(\S+)\s+(\d{4})$/) ?? [];
  const monthNumber = getMonthNumber(monthName);
  if (!monthNumber) return [];

  try {
    const rows = await extractPositionedRows(buffer);
    return buildDaysFromRows(rows, monthNumber, year);
  } catch {
    return [];
  }
}

async function extractPositionedRows(buffer: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

  const data = Uint8Array.from(new Uint8Array(buffer));
  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
  } as Parameters<typeof pdfjs.getDocument>[0]);
  const doc = await loadingTask.promise;
  const rows: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageRows = groupTextItemsIntoRows(content.items as Array<{ str: string; transform: number[] }>);
    rows.push(...pageRows);
    page.cleanup();
  }

  await doc.destroy();
  return rows;
}

function groupTextItemsIntoRows(items: Array<{ str: string; transform: number[] }>) {
  const groups: Array<{ y: number; items: Array<{ x: number; text: string }> }> = [];

  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;

    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    let group = groups.find((row) => Math.abs(row.y - y) <= 3);

    if (!group) {
      group = { y, items: [] };
      groups.push(group);
    }

    group.items.push({ x, text });
  }

  return groups
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" "),
    )
    .map(normalizeText)
    .filter(Boolean);
}

function buildDaysFromRows(rows: string[], monthNumber: number, year: string) {
  const dayMap = new Map<string, DayHours>();
  let currentDate: string | null = null;

  for (const row of rows) {
    const parsedDate = parseDateFromText(row, monthNumber, year);
    if (parsedDate) currentDate = parsedDate;
    if (!currentDate) continue;

    const holiday = /festivo|holiday/i.test(row);
    const segments = extractSegments(row);
    if (!segments.length && !holiday) continue;

    const existing = dayMap.get(currentDate) ?? {
      date: currentDate,
      segments: [],
      totalMinutes: 0,
      holiday: false,
      source: "pdf" as const,
    };

    existing.holiday = existing.holiday || holiday;
    existing.segments.push(...segments);
    existing.totalMinutes = existing.segments.reduce((sum, segment) => sum + segment.minutes, 0);
    dayMap.set(currentDate, existing);
  }

  return [...dayMap.values()].filter((day) => day.holiday || day.segments.length > 0);
}

async function extractTableHours(parser: { getTable: () => Promise<{ mergedTables: string[][][] }> }, month: string) {
  const [, monthName = "", year = "2026"] = month.match(/^(\S+)\s+(\d{4})$/) ?? [];
  const monthNumber = getMonthNumber(monthName);
  if (!monthNumber) return [];

  try {
    const tableResult = await parser.getTable();
    const dayMap = new Map<string, DayHours>();

    for (const table of tableResult.mergedTables) {
      let currentDate: string | null = null;

      for (const row of table) {
        const rowText = normalizeText(row.join(" "));
        const parsedDate = parseDateFromText(rowText, monthNumber, year);
        if (parsedDate) currentDate = parsedDate;
        if (!currentDate) continue;

        const holiday = /festivo|holiday/i.test(rowText);
        const segments = extractSegments(rowText);
        if (!segments.length && !holiday) continue;

        const existing = dayMap.get(currentDate) ?? {
          date: currentDate,
          segments: [],
          totalMinutes: 0,
          holiday: false,
          source: "pdf" as const,
        };

        existing.holiday = existing.holiday || holiday;
        existing.segments.push(...segments);
        existing.totalMinutes = existing.segments.reduce((sum, segment) => sum + segment.minutes, 0);
        dayMap.set(currentDate, existing);
      }
    }

    return [...dayMap.values()].filter((day) => day.holiday || day.segments.length > 0);
  } catch {
    return [];
  }
}

function parseDateFromText(value: string, monthNumber: number, year: string) {
  const match = value.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!match) return null;
  const parsedYear = match[3].length === 2 ? `20${match[3]}` : match[3];
  if (Number(match[2]) !== monthNumber || parsedYear !== year) return null;
  return dateKey(match[1], match[2], parsedYear);
}

function extractSegments(chunk: string) {
  const timeMatches = [...chunk.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
  const segments: WorkSegment[] = [];
  const clockTimes = timeMatches.filter((time) => {
    const minutes = timeToMinutes(time);
    return minutes >= 8 * 60 && time !== "00:00";
  });

  for (let index = 0; index < clockTimes.length - 1 && segments.length < 2; index += 2) {
    const start = clockTimes[index];
    const end = clockTimes[index + 1];
    const duration = timeToMinutes(end) - timeToMinutes(start);
    if (duration <= 0 || duration > 8 * 60) {
      index -= 1;
      continue;
    }
    segments.push(makeSegment(start, end));
  }

  return segments;
}

function extractLooseRows(text: string, monthNumber: number, year: string): DayHours[] {
  const days: DayHours[] = [];
  const rowPattern = new RegExp(`(\\d{1,2})[\\/. -]${monthNumber}[\\/. -]${year}(.{0,320})`, "g");
  for (const match of text.matchAll(rowPattern)) {
    const segments = extractSegments(match[0]);
    if (!segments.length) continue;
    const date = dateKey(match[1], String(monthNumber), year);
    days.push({
      date,
      segments,
      totalMinutes: segments.reduce((sum, segment) => sum + segment.minutes, 0),
      source: "pdf",
    });
  }
  return days;
}

function getMonthNumber(monthName: string) {
  const months: Record<string, number> = {
    ENERO: 1,
    FEBRERO: 2,
    MARZO: 3,
    ABRIL: 4,
    MAYO: 5,
    JUNIO: 6,
    JULIO: 7,
    AGOSTO: 8,
    SEPTIEMBRE: 9,
    OCTUBRE: 10,
    NOVIEMBRE: 11,
    DICIEMBRE: 12,
  };
  return months[monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()] ?? 0;
}
