"use client";

import { useState } from "react";
import { TAX_KNOWLEDGE_SOURCES } from "@/lib/renta-fiscal/tax-knowledge";

type RefreshSource = {
  id: string;
  title: string;
  description: string;
  url: string;
  checkedAt: string;
  available: boolean;
  statusText: string;
};

export function TaxKnowledgeRefresh() {
  const [sources, setSources] = useState<RefreshSource[]>(
    TAX_KNOWLEDGE_SOURCES.map((source) => ({
      ...source,
      checkedAt: "",
      available: false,
      statusText: "Pendiente de comprobar",
    })),
  );
  const [notice, setNotice] = useState("Pulsa refrescar para comprobar fuentes oficiales antes de revisar deducciones o modelos.");
  const [loading, setLoading] = useState(false);

  async function refreshSources() {
    setLoading(true);
    const response = await fetch("/tax-knowledge/refresh", { method: "POST" });
    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setNotice(result?.error ?? "No se pudo refrescar la informacion fiscal.");
      return;
    }

    setSources(result.sources ?? []);
    setNotice(result.notice ?? "Fuentes oficiales revisadas.");
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Informacion fiscal actualizada</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Refrescar deducciones y modelos oficiales</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Las deducciones pueden cambiar por año y comunidad autonoma. FORSETI comprueba enlaces oficiales y te recuerda revisar la fuente antes de dar nada por confirmado.
          </p>
          <p className="mt-3 inline-flex rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
            Sin coste de IA: esta comprobacion no usa modelos ni consume tokens.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshSources}
          disabled={loading}
          className="h-10 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refrescando..." : "Refrescar informacion"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <p className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{notice}</p>
        <p className="rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-zinc-300">
          Solo consulta enlaces oficiales mediante peticiones normales.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {sources.map((source) => (
          <article key={source.id} className="rounded-md border border-white/10 bg-slate-950/40 p-3">
            <p className="font-semibold text-white">{source.title}</p>
            <p className="mt-2 text-sm leading-5 text-zinc-400">{source.description}</p>
            <p className={`mt-3 text-sm font-medium ${source.available ? "text-emerald-200" : "text-amber-200"}`}>{source.statusText}</p>
            {source.checkedAt ? <p className="mt-1 text-xs text-zinc-500">Ultima comprobacion: {new Date(source.checkedAt).toLocaleString("es-ES")}</p> : null}
            <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">
              Abrir fuente oficial
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
