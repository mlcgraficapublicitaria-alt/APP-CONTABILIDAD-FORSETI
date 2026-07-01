"use server";

import { getDefaultMonthLabel } from "@/app/navigation";
import { compareHours } from "@/lib/forseti-hours-compare";
import { applyHourDifferences } from "@/lib/forseti-hours-apply";
import { readMonthlyHoursPdfFromDrive } from "@/lib/forseti-hours-drive";
import { extractPdfDebugRows, extractPdfHours } from "@/lib/forseti-hours-pdf";
import { readSheetClientTotalMinutes, readSheetMonthHours } from "@/lib/forseti-hours-sheet";
import { hasGoogleServiceAccountCredentials } from "@/lib/google-service-account";
import type { AuditClient, HoursCompareResult } from "@/lib/forseti-hours-types";

export type AuditActionState = {
  result?: HoursCompareResult;
  message?: string;
  error?: string;
};

type ApplyHoursPayload = Pick<HoursCompareResult, "month" | "pdfDays" | "differences">;

export async function compareHoursAction(_state: AuditActionState, formData: FormData): Promise<AuditActionState> {
  const month = String(formData.get("month") ?? getDefaultMonthLabel());
  const client = parseClient(formData.get("client"));
  const file = formData.get("pdf");

  try {
    let pdfBuffer: ArrayBuffer;
    if (file instanceof File && file.size > 0) {
      pdfBuffer = await file.arrayBuffer();
    } else {
      if (!hasGoogleServiceAccountCredentials()) {
        return {
          error:
            "Sube el PDF mensual de HORAS o configura credenciales de Google en servidor para localizarlo automaticamente en Drive.",
        };
      }
      pdfBuffer = (await readMonthlyHoursPdfFromDrive(month)).buffer;
    }

    const [pdfDays, sheetDays, sheetClientTotalMinutes, pdfDebugRows] = await Promise.all([
      extractPdfHours(pdfBuffer, month),
      readSheetMonthHours(month),
      readSheetClientTotalMinutes(month, client),
      extractPdfDebugRows(pdfBuffer, month),
    ]);

    if (pdfDays.length === 0) {
      return { error: "No he podido extraer dias/tramos del PDF. Revisa que sea el PDF mensual de HORAS correcto." };
    }

    return { result: compareHours(month, client, pdfDays, sheetDays, sheetClientTotalMinutes, pdfDebugRows) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo completar la comparacion.",
    };
  }
}

function parseClient(value: FormDataEntryValue | null): AuditClient {
  if (value === "GRUPO DIM" || value === "MLCDESIGN" || value === "SPANISH-CHEESE") return value;
  return "SPANISH-CHEESE";
}

export async function applyHoursAction(_state: AuditActionState, formData: FormData): Promise<AuditActionState> {
  const payload = String(formData.get("payload") ?? "");
  const confirmed = formData.get("confirmed") === "on";

  if (!confirmed) return { error: "Confirma la aplicacion de cambios antes de escribir en el Sheet." };
  if (!payload) return { error: "Primero compara horas para generar una lista de cambios." };

  try {
    const result = JSON.parse(payload) as ApplyHoursPayload;
    if (!result.differences.length) return { message: "No hay diferencias que aplicar." };

    const applyResult = await applyHourDifferences(result.month, result.pdfDays, result.differences);
    return { message: applyResult.message };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo aplicar la actualizacion en Google Sheets.",
    };
  }
}
