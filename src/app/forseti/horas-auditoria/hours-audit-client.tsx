"use client";

import { useActionState, useState } from "react";
import { getDefaultMonthLabel, MONTHS_2026 } from "@/app/navigation";
import { applyHoursAction, compareHoursAction, type AuditActionState } from "./actions";

const initialState: AuditActionState = {};
const AUDIT_CLIENTS = ["SPANISH-CHEESE", "GRUPO DIM", "MLCDESIGN"] as const;

function formatMinutes(minutes: number) {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function HoursAuditClient() {
  const [compareState, compareFormAction, comparing] = useActionState(compareHoursAction, initialState);
  const [applyState, applyFormAction, applying] = useActionState(applyHoursAction, initialState);
  const [confirmed, setConfirmed] = useState(false);
  const defaultMonth = getDefaultMonthLabel();
  const differences = compareState.result?.differences ?? [];
  const payload = compareState.result
    ? JSON.stringify({
        month: compareState.result.month,
        pdfDays: compareState.result.pdfDays,
        differences: compareState.result.differences,
      })
    : "";
  const pdfTotal = compareState.result?.pdfDays.reduce((sum, day) => sum + day.totalMinutes, 0) ?? 0;
  const sheetTotal = compareState.result?.sheetClientTotalMinutes ?? 0;
  const totalDiff = pdfTotal - sheetTotal;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form action={compareFormAction} className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
        <h2 className="text-xl font-semibold text-white">Fuentes de auditoria</h2>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-200">Mes</span>
            <select name="month" defaultValue={defaultMonth} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none">
              {MONTHS_2026.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-200">Cliente</span>
            <select name="client" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none">
              {AUDIT_CLIENTS.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-200">PDF de HORAS</span>
            <input
              name="pdf"
              type="file"
              accept="application/pdf"
              className="mt-2 w-full rounded-xl border border-dashed border-emerald-300/30 bg-slate-950/50 px-4 py-5 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[#5ab94e] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
            />
            <span className="mt-2 block text-xs leading-5 text-zinc-500">
              Si no subes PDF, FORSETI intentara localizarlo en Drive con las credenciales del servidor.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-200">Sheet destino</span>
            <input
              readOnly
              value="HORAS TRABAJO 2026 - FORSETI"
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 text-sm text-zinc-200 outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={comparing}
            className="w-full rounded-lg bg-[#5ab94e] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-[#6dcc62] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {comparing ? "Comparando..." : "Comparar horas"}
          </button>

          {compareState.error ? (
            <p className="rounded-xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {compareState.error}
            </p>
          ) : null}
          {compareState.result ? (
            <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {compareState.result.message}
            </p>
          ) : null}
        </div>
      </form>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Diferencias detectadas</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Comparacion por dia, tramos y total diario.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            {differences.length} diferencias
          </span>
        </div>

        {compareState.result ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Total PDF</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatMinutes(pdfTotal)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Total {compareState.result.client}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatMinutes(sheetTotal)}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Diferencia total</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-100">{formatMinutes(totalDiff)}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-[0.8fr_1.4fr_1.4fr_0.7fr] gap-3 border-b border-white/10 bg-slate-950/70 px-4 py-3 text-xs font-semibold text-zinc-400">
            <p>Dia</p>
            <p>PDF</p>
            <p>HORAS TRABAJO</p>
            <p>Diferencia</p>
          </div>
          <div className="divide-y divide-white/10 text-sm">
            {differences.length ? (
              differences.map((item) => (
                <div key={`${item.date}-${item.type}`} className="grid grid-cols-[0.8fr_1.4fr_1.4fr_0.7fr] gap-3 px-4 py-3 text-zinc-200">
                  <p className="font-medium text-white">{item.date}</p>
                  <p>{item.pdfLabel}</p>
                  <p>{item.sheetLabel}</p>
                  <p className="font-semibold text-emerald-300">{item.diffLabel}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-5 text-sm text-zinc-400">
                Sube un PDF y pulsa Comparar para ver diferencias reales.
              </p>
            )}
          </div>
        </div>

        {compareState.result?.pdfDebugRows?.length ? (
          <details className="mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-200">
              Ver filas leidas del PDF
            </summary>
            <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs leading-5 text-zinc-300">
              {compareState.result.pdfDebugRows.join("\n")}
            </pre>
          </details>
        ) : null}

        <form action={applyFormAction} className="mt-5 space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <input type="hidden" name="payload" value={payload} />
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              name="confirmed"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="size-4 accent-[#5ab94e]"
            />
            Confirmo que quiero aplicar solo las diferencias detectadas al Sheet.
          </label>
          <button
            type="submit"
            disabled={!confirmed || applying || differences.length === 0}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? "Aplicando..." : "Aplicar cambios"}
          </button>
          {applyState.error ? (
            <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {applyState.error}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
