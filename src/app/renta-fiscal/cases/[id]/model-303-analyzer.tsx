"use client";

import { FormEvent, useState } from "react";
import type { Model303Analysis } from "@/lib/renta-fiscal/model-303-analysis";
import { HelpModal } from "../../help-modal";

type Model303AnalyzerProps = {
  taxCaseId: string;
};

export function Model303Analyzer({ taxCaseId }: Model303AnalyzerProps) {
  const [analysis, setAnalysis] = useState<Model303Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/tax-cases/${taxCaseId}/forms/303/analyze`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(result?.error ?? "No se pudo analizar el modelo 303.");
      return;
    }

    setAnalysis(result.analysis);
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Analizar modelo 303</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Sube el PDF del modelo 303 para detectar puntos de revision sobre IVA, facturas y posibles deducciones segun el perfil del expediente.
          </p>
        </div>
        <HelpModal title="Como ayuda el analisis del modelo 303" triggerLabel="Ayuda">
          <p>FORSETI revisa señales basicas del modelo 303 y las cruza con el perfil fiscal. Sirve para detectar puntos que conviene revisar antes de preparar la renta.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Comprueba si el documento parece un modelo 303.</li>
            <li>Busca señales de IVA deducible, actividad, devolucion o compensacion.</li>
            <li>Propone puntos de revision: facturas, gastos afectos, saldos pendientes o incoherencias con el perfil.</li>
          </ul>
          <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-amber-100">No confirma automaticamente que un gasto sea deducible. Siempre hay que contrastarlo con facturas, libros registro y normativa oficial.</p>
        </HelpModal>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          name="pdf"
          type="file"
          accept="application/pdf"
          className="w-full rounded-md border border-dashed border-emerald-300/30 bg-slate-950/50 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
          required
        />
        <button disabled={loading} className="h-11 shrink-0 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50">
          {loading ? "Analizando..." : "Analizar 303"}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-md border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      {analysis ? (
        <div className="mt-5 grid gap-4">
          <p className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{analysis.disclaimer}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.reviewPoints.map((point) => (
              <article key={point.title} className="rounded-md border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Prioridad {point.priority}</p>
                <h3 className="mt-2 font-semibold text-white">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{point.detail}</p>
              </article>
            ))}
          </div>
          <details className="rounded-md border border-white/10 bg-slate-950/40 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Ver primeras lineas detectadas del PDF</summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-zinc-400">{analysis.extractedTextPreview.join("\n")}</pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
