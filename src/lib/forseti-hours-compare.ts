import type { AuditClient, ClientBillingInfo, DayHours, HoursCompareResult, HoursDifference, WorkSegment } from "./forseti-hours-types";

function formatSegment(segment: WorkSegment) {
  return `${segment.start}-${segment.end}`;
}

function formatDay(day?: DayHours) {
  if (!day) return "sin registro";
  if (day.holiday && day.segments.length === 0) return "FESTIVO";
  if (day.segments.length === 0) return "0:00";
  return day.segments.map(formatSegment).join(" / ");
}

function formatDiff(minutes: number) {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

function sameSegments(pdf: DayHours, sheet: DayHours) {
  if (pdf.segments.length !== sheet.segments.length) return false;
  return pdf.segments.every((segment, index) => {
    const other = sheet.segments[index];
    return other && segment.start === other.start && segment.end === other.end;
  });
}

function buildDifference(date: string, pdf: DayHours | undefined, sheet: DayHours | undefined): HoursDifference | null {
  if (!pdf && !sheet) return null;

  if ((!pdf || pdf.totalMinutes === 0) && sheet?.holiday && sheet.totalMinutes === 0) return null;
  if ((!sheet || sheet.totalMinutes === 0) && pdf?.holiday && pdf.totalMinutes === 0) return null;

  if (pdf && !sheet) {
    if (pdf.totalMinutes === 0) return null;
    return {
      date,
      pdfLabel: formatDay(pdf),
      sheetLabel: "sin registro",
      diffLabel: formatDiff(pdf.totalMinutes),
      diffMinutes: pdf.totalMinutes,
      type: "missing-in-sheet",
      detail: "Dia presente en PDF pero no en HORAS TRABAJO.",
    };
  }

  if (!pdf && sheet) {
    if (sheet.totalMinutes === 0) return null;
    return {
      date,
      pdfLabel: "sin registro",
      sheetLabel: formatDay(sheet),
      diffLabel: formatDiff(-sheet.totalMinutes),
      diffMinutes: -sheet.totalMinutes,
      type: "missing-in-pdf",
      detail: "Dia presente en HORAS TRABAJO pero no en PDF.",
    };
  }

  if (!pdf || !sheet) return null;
  const diffMinutes = pdf.totalMinutes - sheet.totalMinutes;
  const hasSegmentMismatch = !sameSegments(pdf, sheet);

  if (!hasSegmentMismatch && diffMinutes === 0) return null;

  return {
    date,
    pdfLabel: formatDay(pdf),
    sheetLabel: formatDay(sheet),
    diffLabel: formatDiff(diffMinutes),
    diffMinutes,
    type: hasSegmentMismatch ? "segment-mismatch" : "total-mismatch",
    detail: hasSegmentMismatch ? "Diferencia de entrada/salida o número de tramos." : "Diferencia de total diario.",
  };
}

export function compareHours(
  month: string,
  client: AuditClient,
  pdfDays: DayHours[],
  sheetDays: DayHours[],
  sheetClientTotalMinutes: number,
  billingInfo?: ClientBillingInfo,
  pdfDebugRows?: string[],
): HoursCompareResult {
  const pdfByDate = new Map(pdfDays.map((day) => [day.date, day]));
  const sheetByDate = new Map(sheetDays.map((day) => [day.date, day]));
  const dates = [...new Set([...pdfByDate.keys(), ...sheetByDate.keys()])].sort((a, b) => {
    const [dayA, monthA, yearA] = a.split("/").map(Number);
    const [dayB, monthB, yearB] = b.split("/").map(Number);
    return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
  });
  const differences = dates
    .map((date) => buildDifference(date, pdfByDate.get(date), sheetByDate.get(date)))
    .filter((item): item is HoursDifference => item !== null);

  return {
    ok: true,
    month,
    client,
    message: differences.length ? `${differences.length} diferencias detectadas.` : "No se han detectado diferencias.",
    differences,
    pdfDays,
    sheetDays,
    sheetClientTotalMinutes,
    billingInfo,
    pdfDebugRows,
  };
}
