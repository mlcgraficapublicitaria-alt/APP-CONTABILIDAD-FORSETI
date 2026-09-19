"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ImportPreview } from "@/lib/cierre-trimestral/import-types";

type TaxCase = { id: string; title: string; fiscalYear: number };
type PreviewResponse = { fileName?: string; closureId?: string; batchId?: string; preview: ImportPreview; warnings?: string[] };
type Summary = {
  id: string; fiscalYear: number; quarter: number; status: string;
  totals: { salesBaseCents: number; purchasesBaseCents: number; outputVatCents: number; inputVatCents: number; result303Cents: number; netIncomeCents: number; provisional130Cents: number; entries: number };
  form349: Array<{ counterpartyId: string; operationType: string; amountCents: number }>;
  issues: Array<{ id: string; severity: string; message: string }>;
  checks: Record<string, boolean>; warnings: string[];
};

function money(cents: number) { return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100); }

export function QuarterlyClosureClient() {
  const [source, setSource] = useState<"sheets" | "csv">("sheets");
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(3);
  const [sheetId, setSheetId] = useState("");
  const [taxCases, setTaxCases] = useState<TaxCase[]>([]);
  const [taxCaseId, setTaxCaseId] = useState("");
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/tax-cases").then((response) => response.json()).then((payload: { taxCases?: TaxCase[] }) => {
      const cases = payload.taxCases ?? [];
      setTaxCases(cases);
      if (cases[0]) { setTaxCaseId(cases[0].id); setYear(cases[0].fiscalYear); }
    }).catch(() => setError("No se pudieron cargar los expedientes fiscales."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice(""); setResult(null); setSummary(null);
    try {
      let response: Response;
      if (source === "sheets") {
        response = await fetch("/api/cierres-trimestrales/google-sheets/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taxCaseId, sheetId, fiscalYear: year, quarter }) });
      } else {
        response = await fetch("/api/cierres-trimestrales/preview", { method: "POST", body: new FormData(event.currentTarget) });
      }
      const payload = await response.json() as PreviewResponse | { error?: string };
      if (!response.ok || !("preview" in payload)) throw new Error("error" in payload && payload.error ? payload.error : "No se pudo generar la vista previa.");
      setResult(payload); setNotice("Vista previa generada. Revisa las incidencias antes de confirmar.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo generar la vista previa."); }
    finally { setLoading(false); }
  }

  async function confirm() {
    if (!result?.batchId || !result.closureId) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/cierres-trimestrales/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ batchId: result.batchId }) });
      const payload = await response.json() as { error?: string; imported?: number; duplicates?: number };
      if (!response.ok) throw new Error(payload.error || "No se pudo confirmar.");
      const summaryResponse = await fetch(`/api/cierres-trimestrales/summary?closureId=${encodeURIComponent(result.closureId)}`);
      const summaryPayload = await summaryResponse.json() as { summary?: Summary; error?: string };
      if (!summaryResponse.ok || !summaryPayload.summary) throw new Error(summaryPayload.error || "No se pudo calcular el cierre.");
      setSummary(summaryPayload.summary); setNotice(`Importación confirmada: ${payload.imported ?? 0} movimientos; ${payload.duplicates ?? 0} duplicados.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo confirmar el cierre."); }
    finally { setLoading(false); }
  }

  return <div className="space-y-6">
    <div className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-sm">
      <button type="button" onClick={() => setSource("sheets")} className={`rounded-lg px-4 py-2 ${source === "sheets" ? "bg-[#5ab94e] font-semibold text-[#07110a]" : "text-slate-300"}`}>Google Sheets</button>
      <button type="button" onClick={() => setSource("csv")} className={`rounded-lg px-4 py-2 ${source === "csv" ? "bg-[#5ab94e] font-semibold text-[#07110a]" : "text-slate-300"}`}>CSV de respaldo</button>
    </div>

    <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 lg:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-slate-200">Expediente fiscal
        <select name="taxCaseId" required value={taxCaseId} onChange={(event) => setTaxCaseId(event.target.value)} className="rounded-xl border border-white/15 bg-[#11182a] px-3 py-2.5 text-white">
          <option value="">Selecciona un expediente</option>{taxCases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-200">Ejercicio<input name="year" type="number" min="2020" max="2200" value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-xl border border-white/15 bg-[#11182a] px-3 py-2.5 text-white" /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-200">Trimestre<select name="quarter" value={quarter} onChange={(event) => setQuarter(Number(event.target.value))} className="rounded-xl border border-white/15 bg-[#11182a] px-3 py-2.5 text-white">{[1,2,3,4].map((value) => <option key={value} value={value}>{value}T</option>)}</select></label>
      </div>
      {source === "sheets" ? <label className="grid gap-2 text-sm font-medium text-slate-200 lg:col-span-2">ID del Google Sheet de libros
        <input value={sheetId} onChange={(event) => setSheetId(event.target.value)} required placeholder="El texto situado entre /d/ y /edit en la URL" className="rounded-xl border border-white/15 bg-[#11182a] px-3 py-2.5 text-white" />
        <span className="text-xs font-normal text-slate-400">Debe contener las pestañas EXPEDIDAS y RECIBIDAS. <a className="text-[#78d86d] underline" href="/api/cierres-trimestrales/template?format=xlsx">Descarga la plantilla completa</a>, impórtala en Google Sheets y compártela solo con la cuenta de servicio de FORSETI.</span>
      </label> : <label className="grid gap-2 text-sm font-medium text-slate-200 lg:col-span-2">Libro CSV<input name="file" type="file" accept=".csv,text/csv" required className="rounded-xl border border-dashed border-white/20 bg-[#11182a] px-3 py-2 text-sm text-slate-300" /></label>}
      <button type="submit" disabled={loading} className="rounded-xl bg-[#5ab94e] px-5 py-2.5 font-semibold text-[#07110a] disabled:opacity-60 lg:col-span-2">{loading ? "Procesando…" : "Generar vista previa"}</button>
    </form>

    {notice && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}
    {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

    {result && <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Vista previa del libro</h2><p className="text-sm text-slate-400">{result.preview.counts.valid} válidas · {result.preview.counts.duplicate} duplicadas · {result.preview.counts.invalid} inválidas</p></div>
        {result.batchId && <button type="button" onClick={confirm} disabled={loading || result.preview.counts.invalid > 0} className="rounded-xl bg-[#5ab94e] px-5 py-2.5 font-semibold text-[#07110a] disabled:opacity-40">Confirmar y calcular cierre</button>}
      </div>
      <div className="max-h-[32rem] overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-[#11182a] text-xs uppercase text-slate-400"><tr><th className="p-3">Fila</th><th className="p-3">Estado</th><th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">IVA</th><th className="p-3">Observación</th></tr></thead><tbody className="divide-y divide-white/5">{result.preview.rows.map((row) => <tr key={`${row.sourceRow}-${row.fingerprint}`}><td className="p-3">{row.sourceRow}</td><td className="p-3">{row.status}</td><td className="p-3">{row.normalized?.operationDate ?? "—"}</td><td className="p-3">{row.normalized?.direction ?? "—"}</td><td className="p-3 text-right">{row.normalized ? money(row.normalized.baseCents) : "—"}</td><td className="p-3 text-right">{row.normalized ? money(row.normalized.vatCents) : "—"}</td><td className="p-3">{row.errors.join(" ") || "Sin incidencias"}</td></tr>)}</tbody></table></div>
    </section>}

    {summary && <section className="space-y-5 rounded-2xl border border-[#5ab94e]/30 bg-white/5 p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Resultado provisional {summary.quarter}T/{summary.fiscalYear}</h2><p className="text-sm text-slate-400">{summary.totals.entries} movimientos confirmados</p></div><a href={`/api/cierres-trimestrales/export?closureId=${encodeURIComponent(summary.id)}`} className="rounded-xl border border-[#5ab94e]/50 px-4 py-2 text-sm font-semibold text-[#78d86d]">Descargar libros y resumen XLSX</a></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ["Base ventas", summary.totals.salesBaseCents], ["Base compras", summary.totals.purchasesBaseCents], ["IVA repercutido", summary.totals.outputVatCents], ["IVA soportado", summary.totals.inputVatCents], ["Resultado 303", summary.totals.result303Cents], ["Rendimiento neto", summary.totals.netIncomeCents], ["20% orientativo (no 130 final)", summary.totals.provisional130Cents], ["Operaciones 349", summary.form349.reduce((sum, item) => sum + item.amountCents, 0)],
      ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#11182a] p-4"><p className="text-xs uppercase text-slate-400">{label}</p><p className="mt-2 text-lg font-semibold">{money(Number(value))}</p></div>)}</div>
      {summary.issues.length > 0 && <div><h3 className="font-semibold">Incidencias</h3><ul className="mt-2 space-y-2 text-sm text-amber-200">{summary.issues.map((issue) => <li key={issue.id}>• {issue.severity}: {issue.message}</li>)}</ul></div>}
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100"><p className="font-semibold">Antes de presentar</p><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Descarga el XLSX y contrasta sus datos con el <a className="underline" href="https://sede.agenciatributaria.gob.es/Sede/iva/pre-303/nuevo-servicio-pre303-importacion-libros-electronico.html" target="_blank" rel="noreferrer">formato y validador de Libros Registro de la AEAT</a>.</li><li>Accede a Pre303/Pre130 con Cl@ve o certificado.</li><li>Compara las casillas con este resumen.</li><li>Confirma pago o compensación y guarda el justificante.</li></ol><p className="mt-3 text-xs">El XLSX de FORSETI es un borrador de trabajo; no se etiqueta como validado por la AEAT hasta superar su validador.</p></div>
    </section>}
  </div>;
}
