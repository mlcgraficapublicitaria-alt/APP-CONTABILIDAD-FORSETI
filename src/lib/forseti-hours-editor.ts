import { getGoogleAccessToken } from "./google-service-account";
import { getSheetRange } from "./forseti-hours-sheet";

const SHEET_ID = "1C-4g6B4iiQzCuiWiDGi-YyTm1Tm5Z88bIrTOhlKSsQo";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const HOURS_RANGE_START_ROW = 3;
const HOURS_RANGE = "J3:AF90";

type HoursEditorClient = "SPANISH-CHEESE" | "GRUPO DIM";

const CLIENT_CONFIG: Record<
  HoursEditorClient,
  {
    displaySourceIndexes: number[];
    editableDisplayIndexes: number[];
    firstEditableDisplayIndex: number;
    lastEditableDisplayIndex: number;
    headers: string[];
    sheetRangeStartColumn: string;
    sheetRangeEndColumn: string;
    durationByEndDisplayIndex: Map<number, number>;
  }
> = {
  "SPANISH-CHEESE": {
    displaySourceIndexes: [0, 1, 5, 6, 7],
    editableDisplayIndexes: [2, 3],
    firstEditableDisplayIndex: 2,
    lastEditableDisplayIndex: 4,
    headers: ["FECHA", "DIA", "ENTRADA", "SALIDA", "HORAS"],
    sheetRangeStartColumn: "O",
    sheetRangeEndColumn: "Q",
    durationByEndDisplayIndex: new Map([[3, 4]]),
  },
  "GRUPO DIM": {
    displaySourceIndexes: [0, 1, 11, 12, 13],
    editableDisplayIndexes: [2, 3],
    firstEditableDisplayIndex: 2,
    lastEditableDisplayIndex: 4,
    headers: ["FECHA", "DIA", "ENTRADA", "SALIDA", "HORAS"],
    sheetRangeStartColumn: "U",
    sheetRangeEndColumn: "W",
    durationByEndDisplayIndex: new Map([[3, 4]]),
  },
};

export type SheetHoursRow = {
  rowNumber: number;
  secondaryRowNumber?: number;
  values: string[];
  locked?: boolean;
  continuation?: boolean;
  totalMinutes?: number;
};

export type SheetHoursTable = {
  month: string;
  client: HoursEditorClient;
  headers: string[];
  editableColumnIndexes: number[];
  rows: SheetHoursRow[];
};

export type SheetHoursUpdate = {
  rowNumber: number;
  secondaryRowNumber?: number;
  values: string[];
};

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`;
}

function parseClient(value: string): HoursEditorClient {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase();

  return normalized === "GRUPODIM" ? "GRUPO DIM" : "SPANISH-CHEESE";
}

function pickColumns(row: string[], sourceIndexes: number[]) {
  return sourceIndexes.map((sourceIndex) => row[sourceIndex] ?? "");
}

function normalizeDayName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function isWeekend(day: string) {
  const normalized = normalizeDayName(day);
  return normalized === "SABADO" || normalized === "DOMINGO";
}

function isHoliday(row: string[]) {
  return row.some((cell) => normalizeDayName(cell) === "FESTIVO");
}

function buildDisplayRow(
  row: string[],
  config: (typeof CLIENT_CONFIG)[HoursEditorClient],
  client: HoursEditorClient,
  inheritedDay?: { kind: "holiday" | "weekend" | "workday" },
) {
  const values = pickColumns(row, config.displaySourceIndexes);

  if (client !== "SPANISH-CHEESE") {
    return { values };
  }

  const isContinuation = !parseDate(values[0] ?? "");
  const dayKind = inheritedDay?.kind ?? (isHoliday(row) ? "holiday" : isWeekend(values[1] ?? "") ? "weekend" : "workday");

  if (dayKind === "holiday") {
    return { values: [values[0] ?? "", values[1] ?? "", "FESTIVO", "FESTIVO", "FESTIVO"], locked: true, continuation: isContinuation };
  }

  if (dayKind === "weekend") {
    return { values: [values[0] ?? "", values[1] ?? "", "LIBRE", "LIBRE", "LIBRE"], locked: true, continuation: isContinuation };
  }

  return { values, continuation: isContinuation };
}

function buildGroupedDayRow(
  row: string[],
  nextRow: string[] | null,
  config: (typeof CLIENT_CONFIG)[HoursEditorClient],
) {
  const primaryValues = pickColumns(row, config.displaySourceIndexes);
  const secondaryValues = nextRow ? pickColumns(nextRow, config.displaySourceIndexes) : ["", "", "0:00:00", "0:00:00", "0:00:00"];
  const kind = isHoliday(row) ? "holiday" : isWeekend(primaryValues[1] ?? "") ? "weekend" : "workday";
  const totalMinutes = getRowDisplayMinutes(primaryValues, config) + getRowDisplayMinutes(secondaryValues, config);

  if (kind === "holiday") {
    return {
      values: [primaryValues[0] ?? "", primaryValues[1] ?? "", "FESTIVO", "FESTIVO", "FESTIVO", "FESTIVO", "FESTIVO", "FESTIVO"],
      locked: true,
      totalMinutes,
    };
  }

  if (kind === "weekend") {
    return {
      values: [primaryValues[0] ?? "", primaryValues[1] ?? "", "LIBRE", "LIBRE", "LIBRE", "LIBRE", "LIBRE", "LIBRE"],
      locked: true,
      totalMinutes,
    };
  }

  return {
    values: [
      primaryValues[0] ?? "",
      primaryValues[1] ?? "",
      primaryValues[2] ?? "0:00:00",
      primaryValues[3] ?? "0:00:00",
      primaryValues[4] ?? "0:00:00",
      secondaryValues[2] ?? "0:00:00",
      secondaryValues[3] ?? "0:00:00",
      secondaryValues[4] ?? "0:00:00",
    ],
    totalMinutes,
  };
}

function isUsefulHourRow(row: string[], config: (typeof CLIENT_CONFIG)[HoursEditorClient]) {
  const hasWorkedHours = row.some(
    (cell, index) =>
      index >= config.firstEditableDisplayIndex &&
      index <= config.lastEditableDisplayIndex &&
      cell.trim() &&
      cell.trim() !== "0:00:00",
  );

  if (config === CLIENT_CONFIG["GRUPO DIM"]) {
    return Boolean(row[2]?.trim() || row[3]?.trim() || hasWorkedHours);
  }

  return Boolean(parseDate(row[0] ?? ""));
}

function normalizeRow(row: string[], width: number) {
  return Array.from({ length: width }, (_, index) => row[index] ?? "");
}

function timeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function durationToMinutes(value: string) {
  const match = value.trim().match(/^(\d+):(\d{2})(?::\d{2})?$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToSheetTime(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:00`;
}

function isZeroTime(value: string) {
  return value.trim() === "" || value.trim() === "0:00" || value.trim() === "0:00:00";
}

function calculateDuration(startValue: string, endValue: string) {
  if (isZeroTime(startValue) && isZeroTime(endValue)) return "0:00:00";

  const start = timeToMinutes(startValue);
  const end = timeToMinutes(endValue);
  if (start === null || end === null || end <= start) return "0:00:00";

  return minutesToSheetTime(end - start);
}

function normalizeTimeForSheet(value: string) {
  if (!value.trim()) return "0:00:00";

  const minutes = timeToMinutes(value);
  if (minutes === null) return value.trim();

  return minutesToSheetTime(minutes);
}

function getRowDisplayMinutes(values: string[], config: (typeof CLIENT_CONFIG)[HoursEditorClient]) {
  return durationToMinutes(values[config.lastEditableDisplayIndex] ?? "");
}

export function normalizeEditedHoursRow(values: string[], client: HoursEditorClient) {
  const config = CLIENT_CONFIG[client];
  const normalized = [...values];

  for (const columnIndex of config.editableDisplayIndexes) {
    normalized[columnIndex] = normalizeTimeForSheet(normalized[columnIndex] ?? "");
  }

  for (const [endColumnIndex, durationColumnIndex] of config.durationByEndDisplayIndex) {
    normalized[durationColumnIndex] = calculateDuration(normalized[endColumnIndex - 1] ?? "", normalized[endColumnIndex] ?? "");
  }

  return normalized;
}

function buildUpdateData(month: string, client: HoursEditorClient, updates: SheetHoursUpdate[]) {
  const config = CLIENT_CONFIG[client];

  if (updates.every((update) => update.values.length < 8)) {
    return updates.map((update) => ({
      range: `'${month}'!${config.sheetRangeStartColumn}${update.rowNumber}:${config.sheetRangeEndColumn}${update.rowNumber}`,
      majorDimension: "ROWS",
      values: [
        normalizeEditedHoursRow(update.values, client).slice(
          config.firstEditableDisplayIndex,
          config.lastEditableDisplayIndex + 1,
        ),
      ],
    }));
  }

  return updates.flatMap((update) => {
    const morningValues = normalizeEditedHoursRow(update.values.slice(0, 5), client).slice(2, 5);
    const afternoonDisplayValues = ["", "", update.values[5] ?? "0:00:00", update.values[6] ?? "0:00:00", update.values[7] ?? "0:00:00"];
    const afternoonValues = normalizeEditedHoursRow(afternoonDisplayValues, client).slice(2, 5);
    const data = [
      {
        range: `'${month}'!${config.sheetRangeStartColumn}${update.rowNumber}:${config.sheetRangeEndColumn}${update.rowNumber}`,
        majorDimension: "ROWS",
        values: [morningValues],
      },
    ];

    if (update.secondaryRowNumber) {
      data.push({
        range: `'${month}'!${config.sheetRangeStartColumn}${update.secondaryRowNumber}:${config.sheetRangeEndColumn}${update.secondaryRowNumber}`,
        majorDimension: "ROWS",
        values: [afternoonValues],
      });
    }

    return data;
  });
}

export async function readEditableSheetHours(month: string, clientValue: string): Promise<SheetHoursTable> {
  const client = parseClient(clientValue);
  const config = CLIENT_CONFIG[client];
  const rows = await getSheetRange(month, HOURS_RANGE);
  const [, ...bodyRows] = rows;
  const width = Math.max(...bodyRows.map((row) => row.length), 0);

  if (client === "SPANISH-CHEESE" || client === "GRUPO DIM") {
    const tableRows: SheetHoursRow[] = [];

    bodyRows.forEach((row, index) => {
      const normalizedRow = normalizeRow(row, width);
      const rowNumber = HOURS_RANGE_START_ROW + index + 1;
      const date = parseDate(normalizedRow[0] ?? "");

      if (!date) return;

      const nextRow = bodyRows[index + 1] ? normalizeRow(bodyRows[index + 1], width) : null;
      const nextRowIsContinuation = nextRow && !parseDate(nextRow[0] ?? "");
      const displayRow = buildGroupedDayRow(normalizedRow, nextRowIsContinuation ? nextRow : null, config);

      tableRows.push({
        rowNumber,
        secondaryRowNumber: nextRowIsContinuation ? rowNumber + 1 : undefined,
        ...displayRow,
      });
    });

    return {
      month,
      client,
      headers: ["FECHA", "DIA", "M. ENTRADA", "M. SALIDA", "M. HORAS", "T. ENTRADA", "T. SALIDA", "T. HORAS"],
      editableColumnIndexes: [2, 3, 5, 6],
      rows: tableRows,
    };
  }

  return {
    month,
    client,
    headers: config.headers,
    editableColumnIndexes: config.editableDisplayIndexes,
    rows: bodyRows
      .map((row, index) => {
        const normalizedRow = normalizeRow(row, width);
        const displayRow = buildDisplayRow(normalizedRow, config, client);

        return {
          rowNumber: HOURS_RANGE_START_ROW + index + 1,
          ...displayRow,
        };
      })
      .filter((row) => isUsefulHourRow(row.values, config)),
  };
}

export async function updateEditableSheetHours(month: string, clientValue: string, updates: SheetHoursUpdate[]) {
  const client = parseClient(clientValue);
  const config = CLIENT_CONFIG[client];
  const token = await getGoogleAccessToken([SHEETS_SCOPE]);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: buildUpdateData(month, client, updates),
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "No se pudo guardar la tabla de horarios en Google Sheets.");
}
