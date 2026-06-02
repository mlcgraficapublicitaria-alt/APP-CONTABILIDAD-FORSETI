"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadHoursTableAction, saveHoursTableAction } from "./hours-editor-actions";
import { MONTHS_2026 } from "./navigation";
import type { SheetHoursTable } from "@/lib/forseti-hours-editor";

type ClientHoursEditorProps = {
  client: string;
  month: string;
  actual: string;
  hours: string;
  monthlyTotalBilling: string;
  monthlyTotalNet: string;
  tone?: "default" | "spanishCheese" | "grupoDim";
};

type EditorFinancials = {
  actual: string;
  hours: string;
  monthlyTotalBilling: string;
  monthlyTotalNet: string;
};

function makeRowKey(rowNumber: number) {
  return String(rowNumber);
}

function cloneTable(table: SheetHoursTable): SheetHoursTable {
  return {
    ...table,
    headers: [...table.headers],
    editableColumnIndexes: [...table.editableColumnIndexes],
    rows: table.rows.map((row) => ({
      rowNumber: row.rowNumber,
      secondaryRowNumber: row.secondaryRowNumber,
      values: [...row.values],
      locked: row.locked,
      continuation: row.continuation,
      totalMinutes: row.totalMinutes,
    })),
  };
}

function buildRowSnapshot(table: SheetHoursTable | null) {
  const snapshot = new Map<string, string>();
  table?.rows.forEach((row) => {
    snapshot.set(makeRowKey(row.rowNumber), JSON.stringify(row.values));
  });
  return snapshot;
}

function parseTimeToMinutes(value: string) {
  const match = value.trim().match(/^(\d+):(\d{2})(?::\d{2})?$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function calculateDurationMinutes(startValue: string, endValue: string) {
  const start = parseTimeToMinutes(startValue);
  const end = parseTimeToMinutes(endValue);
  return end > start ? end - start : 0;
}

function formatMinutes(totalMinutes: number) {
  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

function parseMoney(value: string) {
  const normalized = value.replace(/\s/g, "").replace("€", "").replace("EUR", "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getEditorClient(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase() === "GRUPODIM"
    ? "GRUPO DIM"
    : "SPANISH-CHEESE";
}

export function ClientHoursEditor({ client, month, actual, hours, monthlyTotalBilling, monthlyTotalNet, tone = "default" }: ClientHoursEditorProps) {
  const router = useRouter();
  const loadRequestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [modalMonth, setModalMonth] = useState(month);
  const [table, setTable] = useState<SheetHoursTable | null>(null);
  const [financials, setFinancials] = useState<EditorFinancials>({
    actual,
    hours,
    monthlyTotalBilling,
    monthlyTotalNet,
  });
  const [originalRows, setOriginalRows] = useState<Map<string, string>>(new Map());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setModalMonth(month);
    setTable(null);
    setFinancials({
      actual,
      hours,
      monthlyTotalBilling,
      monthlyTotalNet,
    });
    setOriginalRows(new Map());
    setMessage("");
    setError("");
  }, [actual, client, hours, month, monthlyTotalBilling, monthlyTotalNet]);

  const editableColumns = useMemo(() => new Set(table?.editableColumnIndexes ?? []), [table]);
  const isGroupedHoursTable = table?.client === "SPANISH-CHEESE" || table?.client === "GRUPO DIM";
  const changedRows = useMemo(() => {
    if (!table) return [];

    return table.rows.filter((row) => !row.locked && originalRows.get(makeRowKey(row.rowNumber)) !== JSON.stringify(row.values));
  }, [originalRows, table]);
  const originalMinutes = useMemo(() => parseTimeToMinutes(financials.hours), [financials.hours]);
  const originalBilling = useMemo(() => parseMoney(financials.actual), [financials.actual]);
  const netRatio = useMemo(() => {
    const monthlyBilling = parseMoney(financials.monthlyTotalBilling);
    const monthlyNet = parseMoney(financials.monthlyTotalNet);
    return monthlyBilling > 0 ? monthlyNet / monthlyBilling : 1;
  }, [financials.monthlyTotalBilling, financials.monthlyTotalNet]);
  const hourlyRate = originalMinutes > 0 ? originalBilling / (originalMinutes / 60) : 0;
  const totalMinutes = useMemo(() => {
    if (!table) return 0;

    if (isGroupedHoursTable) {
      return table.rows.reduce((sum, row) => {
        if (row.locked && typeof row.totalMinutes === "number") return sum + row.totalMinutes;
        return sum + calculateDurationMinutes(row.values[2] ?? "", row.values[3] ?? "") + calculateDurationMinutes(row.values[5] ?? "", row.values[6] ?? "");
      }, 0);
    }

    const hourColumnIndexes = table.headers
      .map((header, index) => (header.trim().toUpperCase() === "HORAS" ? index : -1))
      .filter((index) => index >= 0);
    return table.rows.reduce((sum, row) => {
      if (row.locked && typeof row.totalMinutes === "number") return sum + row.totalMinutes;

      return sum + hourColumnIndexes.reduce((rowSum, index) => rowSum + parseTimeToMinutes(row.values[index] ?? ""), 0);
    }, 0);
  }, [isGroupedHoursTable, table]);
  const totalHours = formatMinutes(totalMinutes);
  const estimatedBilling = hourlyRate > 0 ? (totalMinutes / 60) * hourlyRate : originalBilling;
  const estimatedNet = estimatedBilling * netRatio;
  const billingDifference = estimatedBilling - originalBilling;

  function loadTable(nextMonth: string) {
    setMessage("");
    setError("");

    if (table?.month === nextMonth && table.client === getEditorClient(client)) return;

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    startTransition(async () => {
      const state = await loadHoursTableAction(nextMonth, client);
      if (loadRequestRef.current !== requestId) return;

      if (state.error) {
        setError(state.error);
        return;
      }

      if (state.table) {
        const nextTable = cloneTable(state.table);
        setTable(nextTable);
        setOriginalRows(buildRowSnapshot(nextTable));
      }

      if (state.financials) {
        setFinancials(state.financials);
      }
    });
  }

  function openEditor() {
    setOpen(true);
    loadTable(modalMonth);
  }

  function changeModalMonth(nextMonth: string) {
    if (changedRows.length > 0 && !window.confirm("Hay cambios sin guardar. Cambiar de mes descartara esos cambios.")) return;

    setModalMonth(nextMonth);
    setTable(null);
    setOriginalRows(new Map());
    loadTable(nextMonth);
  }

  function updateCell(rowNumber: number, columnIndex: number, value: string) {
    setTable((current) => {
      if (!current) return current;

      return {
        ...current,
        rows: current.rows.map((row) => {
          if (row.rowNumber !== rowNumber) return row;

          const values = [...row.values];
          values[columnIndex] = value;
          if (current.client === "SPANISH-CHEESE" || current.client === "GRUPO DIM") {
            values[4] = formatMinutes(calculateDurationMinutes(values[2] ?? "", values[3] ?? ""));
            values[7] = formatMinutes(calculateDurationMinutes(values[5] ?? "", values[6] ?? ""));
          }

          return { ...row, values };
        }),
      };
    });
  }

  function saveChanges() {
    if (!table || changedRows.length === 0) return;

    setMessage("");
    setError("");

    startTransition(async () => {
      const state = await saveHoursTableAction(
        modalMonth,
        client,
        changedRows.map((row) => ({
          rowNumber: row.rowNumber,
          secondaryRowNumber: row.secondaryRowNumber,
          values: row.values,
        })),
      );
      loadRequestRef.current += 1;

      if (state.error) {
        setError(state.error);
        return;
      }

      if (state.table) {
        const nextTable = cloneTable(state.table);
        setTable(nextTable);
        setOriginalRows(buildRowSnapshot(nextTable));
      }

      if (state.financials) {
        setFinancials(state.financials);
      }

      setMessage(state.message ?? "Horarios guardados en Google Sheets.");
      router.refresh();
    });
  }

  const buttonClasses =
    tone === "spanishCheese"
      ? "border-red-700/70 bg-red-600 px-2.5 py-1.5 text-white hover:bg-red-500"
      : tone === "grupoDim"
        ? "border-[#04277f]/70 bg-[#04277f] px-2.5 py-1.5 text-white hover:bg-[#0b3aa6]"
        : "border-white/10 bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/15";

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className={`shrink-0 rounded-md border text-xs font-semibold transition ${buttonClasses}`}
      >
        Editar horarios
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020] text-white shadow-2xl shadow-black/50">
            <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-950 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-cyan-200">HORARIOS</p>
                <h3 className="mt-1 text-xl font-semibold">
                  {client} - {modalMonth}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                  MES
                  <select
                    value={modalMonth}
                    onChange={(event) => changeModalMonth(event.target.value)}
                    disabled={isPending}
                    className="h-9 rounded-lg border border-white/10 bg-slate-950 px-2 text-xs font-medium text-white outline-none transition focus:border-cyan-300 disabled:opacity-60"
                  >
                    {MONTHS_2026.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                {changedRows.length > 0 ? <span className="text-sm text-amber-200">{changedRows.length} fila(s) modificada(s)</span> : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={isPending || changedRows.length === 0}
                  className="rounded-lg border border-[#5ab94e]/70 bg-[#5ab94e] px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#6dcc62] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>

            {message ? <p className="border-b border-emerald-300/20 bg-emerald-300/10 px-5 py-3 text-sm text-emerald-100">{message}</p> : null}
            {error ? <p className="border-b border-red-300/20 bg-red-300/10 px-5 py-3 text-sm text-red-100">{error}</p> : null}

            <div className="min-h-0 flex-1 overflow-auto">
              {!table && isPending ? (
                <p className="px-5 py-8 text-sm text-zinc-400">Cargando tabla de Google Sheets...</p>
              ) : table ? (
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase tracking-[0.08em] text-zinc-300">
                    <tr>
                      <th className="sticky left-0 z-20 border-b border-white/10 bg-slate-900 px-3 py-3 text-zinc-500">Fila</th>
                      {(isGroupedHoursTable ? ["FECHA", "DIA", "ENTRADA", "SALIDA", "HORAS"] : table.headers).map((header, index) => (
                        <th key={`${header}-${index}`} className="whitespace-nowrap border-b border-white/10 px-3 py-3 font-semibold">
                          {header || " "}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isGroupedHoursTable
                      ? table.rows.map((row) => {
                          if (row.locked) {
                            return (
                              <tr key={row.rowNumber} className="bg-white/[0.02] text-zinc-500">
                                <td className="sticky left-0 border-b border-white/10 bg-slate-950 px-3 py-2 text-xs text-zinc-500">{row.rowNumber}</td>
                                <td className="border-b border-white/10 px-2 py-2 align-top">
                                  <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 font-semibold text-zinc-500">{row.values[0]}</span>
                                </td>
                                <td className="border-b border-white/10 px-2 py-2 align-top">
                                  <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 font-semibold text-zinc-500">{row.values[1]}</span>
                                </td>
                                <td className="border-b border-white/10 px-2 py-2 align-top">
                                  <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 font-semibold text-zinc-500">{row.values[2]}</span>
                                </td>
                                <td className="border-b border-white/10 px-2 py-2 align-top">
                                  <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 font-semibold text-zinc-500">{row.values[3]}</span>
                                </td>
                                <td className="border-b border-white/10 px-2 py-2 align-top">
                                  <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 font-semibold text-zinc-500">{row.values[4]}</span>
                                </td>
                              </tr>
                            );
                          }

                          const renderTimeCell = (index: number) => (
                            <td className="border-b border-white/10 px-2 py-2 align-top">
                              {editableColumns.has(index) ? (
                                <input
                                  value={row.values[index]}
                                  onChange={(event) => updateCell(row.rowNumber, index, event.target.value)}
                                  className="h-9 w-28 rounded-md border border-cyan-200/20 bg-slate-950 px-2 text-sm text-white outline-none transition focus:border-cyan-300"
                                />
                              ) : (
                                <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 text-zinc-200">{row.values[index]}</span>
                              )}
                            </td>
                          );

                          return (
                            <>
                              <tr key={`${row.rowNumber}-morning`} className="odd:bg-white/[0.03]">
                                <td rowSpan={2} className="sticky left-0 border-b border-white/10 bg-slate-950 px-3 py-2 text-xs text-zinc-500">
                                  {row.secondaryRowNumber ? `${row.rowNumber}/${row.secondaryRowNumber}` : row.rowNumber}
                                </td>
                                <td rowSpan={2} className="border-b border-white/10 px-2 py-2 align-middle">
                                  <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 text-zinc-200">{row.values[0]}</span>
                                </td>
                                <td rowSpan={2} className="border-b border-white/10 px-2 py-2 align-middle">
                                  <span className="block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 text-zinc-200">{row.values[1]}</span>
                                </td>
                                {renderTimeCell(2)}
                                {renderTimeCell(3)}
                                {renderTimeCell(4)}
                              </tr>
                              <tr key={`${row.rowNumber}-afternoon`} className="bg-white/[0.03]">
                                {renderTimeCell(5)}
                                {renderTimeCell(6)}
                                {renderTimeCell(7)}
                              </tr>
                            </>
                          );
                        })
                      : table.rows.map((row) => (
                          <tr key={row.rowNumber} className={row.locked ? "bg-white/[0.02] text-zinc-500" : "odd:bg-white/[0.03]"}>
                            <td className="sticky left-0 border-b border-white/10 bg-slate-950 px-3 py-2 text-xs text-zinc-500">{row.rowNumber}</td>
                            {row.values.map((cell, index) => (
                              <td key={`${row.rowNumber}-${index}`} className="border-b border-white/10 px-2 py-2 align-top">
                                {editableColumns.has(index) && !row.locked ? (
                                  <input
                                    value={cell}
                                    onChange={(event) => updateCell(row.rowNumber, index, event.target.value)}
                                    className="h-9 w-28 rounded-md border border-cyan-200/20 bg-slate-950 px-2 text-sm text-white outline-none transition focus:border-cyan-300"
                                  />
                                ) : (
                                  <span className={`block min-h-9 min-w-20 whitespace-nowrap px-1 py-2 ${row.locked ? "font-semibold text-zinc-500" : "text-zinc-200"}`}>{cell}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-5 py-8 text-sm text-zinc-400">No hay datos cargados.</p>
              )}
            </div>

            {table ? (
              <div className="grid gap-4 border-t border-white/10 bg-slate-950 px-5 py-4 sm:grid-cols-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-400">TOTAL HORAS</p>
                  <p className="text-2xl font-semibold text-white">{totalHours}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-400">TOTAL FACTURADO</p>
                  <p className="text-2xl font-semibold text-white">{formatMoney(estimatedBilling)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-400">TOTAL NETO</p>
                  <p className="text-2xl font-semibold text-white">{formatMoney(estimatedNet)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-400">DIFERENCIA</p>
                  <p className={`text-2xl font-semibold ${billingDifference >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {formatMoney(billingDifference)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
