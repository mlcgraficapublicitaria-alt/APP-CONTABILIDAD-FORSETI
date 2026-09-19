"use client";

import { FormEvent, useState } from "react";
import type { ImportPreview } from "@/lib/cierre-trimestral/import-types";

type PreviewResponse = { fileName: string; preview: ImportPreview };

function money(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function QuarterlyClosureClient() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(1);
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/cierres-trimestrales/preview", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = await response.json() as PreviewResponse | { error?: string };
      if (!response.ok || !("preview" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "No se pudo generar la vista previa.");
      }
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo generar la vista previa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 lg:grid-cols-[1fr_1fr_2fr_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Ejercicio
          <input name="year" type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-xl border border-white/15 bg-[#11182a] px-3 py-2.5 text-white" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Trimestre
          <select name="quarter" value={quarter} onChange={(event) => setQuarter(Number(event.target.value))} className="rounded-xl border border-white/15 bg-[#11182a] px-3 py-2.5 text-white">
            {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}T</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Libro CSV
          <input name="file" type="file" accept=".csv,text/csv" required className="rounded-xl border border-dashed border-white/20 bg-[#11182a] px-3 py-2 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[#5ab94e] file:px-3 file:py-1.5 file:font-semibold file:text-[#07110a]" />
        </label>
        <button type="submit" disabled={loading} className="rounded-xl bg-[#5ab94e] px-5 py-2.5 font-semibold text-[#07110a] disabled:cursor-wait disabled:opacity-60">
          {loading ? "Analizando…" : "Generar vista previa"}
        </button>
      </form>

      <p className="text-xs leading-5 text-slate-400">Vista previa local de {quarter}T/{year}. No confirma, persiste ni presenta datos ante la AEAT.</p>
      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {result && (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-lg font-semibold">Vista previa: {result.fileName}</h2><p className="mt-1 text-sm text-slate-400">Separador detectado: {result.preview.delimiter === "\t" ? "tabulador" : result.preview.delimiter}</p></div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">{result.preview.counts.valid} válidas</span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-200">{result.preview.counts.duplicate} duplicadas</span>
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-red-200">{result.preview.counts.invalid} inválidas</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-3">Fila</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Dirección</th><th className="px-3 py-3 text-right">Base</th><th className="px-3 py-3 text-right">IVA</th><th className="px-3 py-3">Observación</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {result.preview.rows.map((row) => <tr key={`${row.sourceRow}-${row.fingerprint}`}><td className="px-3 py-3 text-slate-400">{row.sourceRow}</td><td className="px-3 py-3">{row.status}</td><td className="px-3 py-3">{row.normalized?.operationDate ?? "—"}</td><td className="px-3 py-3">{row.normalized?.direction ?? "—"}</td><td className="px-3 py-3 text-right">{row.normalized ? money(row.normalized.baseCents) : "—"}</td><td className="px-3 py-3 text-right">{row.normalized ? money(row.normalized.vatCents) : "—"}</td><td className="max-w-sm px-3 py-3 text-slate-300">{row.errors.join(" ") || "Sin incidencias"}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
