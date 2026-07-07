import { getGoogleAccessToken } from "./google-service-account";
import { getSheetRange } from "./forseti-hours-sheet";
import type { DayHours, HoursApplyResult, HoursDifference, WorkSegment } from "./forseti-hours-types";

const SHEET_ID = "1C-4g6B4iiQzCuiWiDGi-YyTm1Tm5Z88bIrTOhlKSsQo";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEETS_WRITE_TIMEOUT_MS = 15_000;
const HOUR_SLOTS = ["O", "R", "U"] as const;

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`;
}

function minutesToSheetTime(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:00`;
}

function emptySlot() {
  return ["0:00:00", "0:00:00", "0:00:00"];
}

function segmentSlot(segment?: WorkSegment) {
  if (!segment) return emptySlot();
  return [`${segment.start}:00`, `${segment.end}:00`, minutesToSheetTime(segment.minutes)];
}

function buildRows(day?: DayHours) {
  const segments = day?.segments ?? [];
  return [
    [segmentSlot(segments[0]), segmentSlot(segments[1]), segmentSlot(segments[2])].flat(),
    [segmentSlot(segments[3]), segmentSlot(segments[4]), segmentSlot(segments[5])].flat(),
  ];
}

function findDayRows(rows: string[][]) {
  const dayRows = new Map<string, number>();
  rows.forEach((row, index) => {
    const date = parseDate(row[9] ?? "");
    if (date) dayRows.set(date, index + 1);
  });
  return dayRows;
}

async function updateSheetValues(month: string, updates: Array<{ row: number; values: string[][] }>) {
  const token = await getGoogleAccessToken([SHEETS_SCOPE]);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(SHEETS_WRITE_TIMEOUT_MS),
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: updates.map((update) => ({
        range: `'${month}'!${HOUR_SLOTS[0]}${update.row}:W${update.row + 1}`,
        majorDimension: "ROWS",
        values: update.values,
      })),
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "No se pudo escribir en Google Sheets.");
}

export async function applyHourDifferences(
  month: string,
  pdfDays: DayHours[],
  differences: HoursDifference[],
): Promise<HoursApplyResult> {
  const rows = await getSheetRange(month, "A1:AV90");
  const dayRows = findDayRows(rows);
  const pdfByDate = new Map(pdfDays.map((day) => [day.date, day]));
  const updatedDays: string[] = [];
  const skippedDays: string[] = [];
  const updates: Array<{ row: number; values: string[][] }> = [];

  for (const difference of differences) {
    const row = dayRows.get(difference.date);
    if (!row) {
      skippedDays.push(difference.date);
      continue;
    }

    updates.push({
      row,
      values: buildRows(pdfByDate.get(difference.date)),
    });
    updatedDays.push(difference.date);
  }

  if (updates.length > 0) await updateSheetValues(month, updates);

  return {
    updatedDays,
    skippedDays,
    message: updatedDays.length
      ? `${updatedDays.length} días actualizados en HORAS TRABAJO.`
      : "No había días actualizables.",
  };
}
