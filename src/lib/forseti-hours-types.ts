export type WorkSegment = {
  start: string;
  end: string;
  minutes: number;
};

export type DayHours = {
  date: string;
  segments: WorkSegment[];
  totalMinutes: number;
  holiday?: boolean;
  source: "pdf" | "sheet";
};

export type AuditClient = "SPANISH-CHEESE" | "GRUPO DIM" | "MLCDESIGN";

export type HoursDifference = {
  date: string;
  pdfLabel: string;
  sheetLabel: string;
  diffLabel: string;
  diffMinutes: number;
  type: "missing-in-sheet" | "missing-in-pdf" | "segment-mismatch" | "total-mismatch";
  detail: string;
};

export type HoursCompareResult = {
  ok: boolean;
  month: string;
  client: AuditClient;
  message: string;
  differences: HoursDifference[];
  pdfDays: DayHours[];
  sheetDays: DayHours[];
  sheetClientTotalMinutes: number;
  pdfDebugRows?: string[];
};

export type HoursApplyResult = {
  updatedDays: string[];
  skippedDays: string[];
  message: string;
};
