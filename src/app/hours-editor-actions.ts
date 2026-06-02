"use server";

import { revalidatePath } from "next/cache";
import {
  readEditableSheetHours,
  updateEditableSheetHours,
  type SheetHoursTable,
  type SheetHoursUpdate,
} from "@/lib/forseti-hours-editor";
import { getDashboardData } from "@/lib/sheets";

type HoursEditorFinancials = {
  actual: string;
  hours: string;
  monthlyTotalBilling: string;
  monthlyTotalNet: string;
};

export type HoursEditorState = {
  table?: SheetHoursTable;
  financials?: HoursEditorFinancials;
  message?: string;
  error?: string;
};

function normalizeClientName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase();
}

async function readEditorFinancials(month: string, client: string): Promise<HoursEditorFinancials> {
  const data = await getDashboardData(month);
  const normalizedClient = normalizeClientName(client);
  const summary = data.clientSummary.find((item) => normalizeClientName(item.client) === normalizedClient);

  return {
    actual: summary?.actual ?? "0 EUR",
    hours: summary?.hours ?? "0:00:00",
    monthlyTotalBilling: data.totalFactura,
    monthlyTotalNet: data.totalNeto,
  };
}

export async function loadHoursTableAction(month: string, client: string): Promise<HoursEditorState> {
  try {
    const [table, financials] = await Promise.all([
      readEditableSheetHours(month, client),
      readEditorFinancials(month, client),
    ]);

    return { table, financials };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo cargar la tabla de horarios.",
    };
  }
}

export async function saveHoursTableAction(month: string, client: string, updates: SheetHoursUpdate[]): Promise<HoursEditorState> {
  try {
    if (updates.length === 0) return { message: "No habia cambios que guardar." };

    await updateEditableSheetHours(month, client, updates);
    revalidatePath("/");
    const [table, financials] = await Promise.all([
      readEditableSheetHours(month, client),
      readEditorFinancials(month, client),
    ]);

    return {
      table,
      financials,
      message: `${updates.length} fila${updates.length === 1 ? "" : "s"} guardada${updates.length === 1 ? "" : "s"} en Google Sheets.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo guardar la tabla de horarios.",
    };
  }
}
