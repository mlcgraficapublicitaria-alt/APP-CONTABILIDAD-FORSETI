"use client";

import { FormEvent, useState } from "react";
import type { Model130Analysis } from "@/lib/renta-fiscal/model-130-analysis";
import { HelpModal } from "../../help-modal";

type Model130AnalyzerProps = {
  taxCaseId: string;
};

export function Model130Analyzer({ taxCaseId }: Model130AnalyzerProps) {
  const [analysis, setAnalysis] = useState<Model130Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/tax-cases/${taxCaseId}/forms/130/analyze`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(result?.error ?? "No se pudo analizar el modelo 130.");
      return;
    }

    setAnalysis(result.analysis);
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Analizar modelo 130</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Sube el PDF del modelo 130 para detectar puntos de revisión sobre pagos fraccionados de IRPF, ingresos, gastos, retenciones y coherencia con el perfil.
          </p>
        </div>
        <HelpModal title="Como ayuda el analisis del modelo 130" triggerLabel="Ayuda">
          <p>FORSETI revisa señales basicas del modelo 130 y las cruza con el perfil fiscal del expediente.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Comprueba si el documento parece un modelo 130.</li>
            <li>Busca indicios de ingresos, gastos deducibles, retenciones y pagos fraccionados anteriores.</li>
            <li>Propone puntos de revisión para evitar pagar de más o mezclar conceptos que no pertenecen a la actividad.</li>
          </ul>
          <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-amber-100">
            No sustituye la revisión fiscal. Sirve para preparar una comprobación más fina antes de cerrar la renta o contrastarla en la plataforma oficial.
          </p>
        </HelpModal>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          name="pdf"
          type="file"
          accept="application/pdf"
          className="w-full rounded-md border border-dashed border-sky-300/30 bg-slate-950/50 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-sky-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
          required
        />
        <button disabled={loading} className="h-11 shrink-0 rounded-md bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:opacity-50">
          {loading ? "Analizando..." : "Analizar 130"}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-md border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}

      {analysis ? (
        <div className="mt-5 grid gap-4">
          <p className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{analysis.disclaimer}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.reviewPoints.map((point) => (
              <article key={point.title} className="rounded-md border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Prioridad {point.priority}</p>
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
