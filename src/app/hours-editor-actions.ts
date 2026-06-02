"use server";

import { revalidatePath } from "next/cache";
import {
  readEditableSheetHours,
  updateEditableSheetHours,
  type SheetHoursTable,
  type SheetHoursUpdate,
} from "@/lib/forseti-hours-editor";

export type HoursEditorState = {
  table?: SheetHoursTable;
  message?: string;
  error?: string;
};

export async function loadHoursTableAction(month: string, client: string): Promise<HoursEditorState> {
  try {
    return { table: await readEditableSheetHours(month, client) };
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

    return {
      table: await readEditableSheetHours(month, client),
      message: `${updates.length} fila${updates.length === 1 ? "" : "s"} guardada${updates.length === 1 ? "" : "s"} en Google Sheets.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo guardar la tabla de horarios.",
    };
  }
}
