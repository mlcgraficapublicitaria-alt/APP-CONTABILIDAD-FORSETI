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
  refreshedSummary: string;
  updateSummary: string;
  reviewItems: string[];
  contentHash: string;
  contentSize: number;
  changeStatus: "pending" | "first-check" | "unchanged" | "changed" | "unavailable";
  changeSummary: string;
};

const SNAPSHOT_STORAGE_KEY = "forseti:renta-fiscal:official-source-hashes";

export function TaxKnowledgeRefresh() {
  const [sources, setSources] = useState<RefreshSource[]>(
    TAX_KNOWLEDGE_SOURCES.map((source) => ({
      ...source,
      checkedAt: "",
      available: false,
      statusText: "Pendiente de comprobar",
      refreshedSummary: "",
      contentHash: "",
      contentSize: 0,
      changeStatus: "pending",
      changeSummary: "Pendiente de refrescar.",
    })),
  );
  const [notice, setNotice] = useState("");
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

    const refreshedSources = applyLocalChangeDetection(result.sources ?? []);
    setSources(refreshedSources);
    setNotice(result.notice ?? "Fuentes oficiales revisadas.");
  }

  return (
    <section className="grid gap-4">
      <header className="mt-3 border-b border-emerald-300/25 pb-4">
        <h2 className="text-2xl font-extrabold uppercase tracking-[0.08em] text-white md:text-3xl">Informacion fiscal actualizada</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
          Revisa fuentes oficiales antes de confirmar deducciones, modelos o criterios fiscales del expediente. Pulsa refrescar para comprobar fuentes oficiales antes de revisar deducciones o modelos.
        </p>
      </header>

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Refrescar deducciones y modelos oficiales</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Las deducciones pueden cambiar por año y comunidad autónoma. FORSETI comprueba enlaces oficiales y te recuerda revisar la fuente antes de dar nada por confirmado.
          </p>
          <p className="mt-3 inline-flex rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100">
            Sin IA
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

      {notice ? <p className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">{notice}</p> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {sources.map((source) => (
          <article key={source.id} className="rounded-md border border-white/10 bg-slate-950/40 p-3">
            <p className="font-semibold text-white">{source.title}</p>
            <p className="mt-2 text-sm leading-5 text-zinc-400">{source.description}</p>
            <p className={`mt-3 text-sm font-medium ${source.available ? "text-emerald-200" : "text-amber-200"}`}>{source.statusText}</p>
            <p className={`mt-2 rounded-md border px-3 py-2 text-sm leading-5 ${getChangeStatusClass(source.changeStatus)}`}>{source.changeSummary}</p>
            <div className="mt-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Resumen de actualizacion</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{source.refreshedSummary || source.updateSummary}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-5 text-zinc-400">
                {source.reviewItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {source.checkedAt ? (
              <p className="mt-1 text-xs text-zinc-500">
                Ultima comprobacion: {new Date(source.checkedAt).toLocaleString("es-ES")} · huella {source.contentHash ? source.contentHash.slice(0, 10) : "no disponible"}
              </p>
            ) : null}
            <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200">
              Abrir fuente oficial
            </a>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}

function applyLocalChangeDetection(rawSources: RefreshSource[]) {
  const previousSnapshots = readSnapshots();
  const nextSnapshots: Record<string, string> = {};

  const sources = rawSources.map((source) => {
    if (!source.available || !source.contentHash) {
      return {
        ...source,
        changeStatus: "unavailable" as const,
        changeSummary: "No se pudo comparar el contenido. Revisar manualmente la fuente oficial.",
      };
    }

    const previousHash = previousSnapshots[source.id];
    nextSnapshots[source.id] = source.contentHash;

    if (!previousHash) {
      return {
        ...source,
        changeStatus: "first-check" as const,
        changeSummary: `Primera comprobacion guardada. Contenido oficial registrado para futuras comparaciones (${source.contentSize.toLocaleString("es-ES")} caracteres).`,
      };
    }

    if (previousHash !== source.contentHash) {
      return {
        ...source,
        changeStatus: "changed" as const,
        changeSummary: "Posible actualizacion detectada: la huella del contenido oficial ha cambiado desde la ultima comprobacion.",
      };
    }

    return {
      ...source,
      changeStatus: "unchanged" as const,
      changeSummary: "Sin cambios detectados desde la ultima comprobacion guardada.",
    };
  });

  writeSnapshots({ ...previousSnapshots, ...nextSnapshots });
  return sources;
}

function readSnapshots() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SNAPSHOT_STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeSnapshots(value: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(value));
}

function getChangeStatusClass(status: RefreshSource["changeStatus"]) {
  const classes: Record<RefreshSource["changeStatus"], string> = {
    pending: "border-white/10 bg-white/[0.04] text-zinc-300",
    "first-check": "border-sky-300/25 bg-sky-300/10 text-sky-100",
    unchanged: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    changed: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    unavailable: "border-red-300/25 bg-red-300/10 text-red-100",
  };
  return classes[status];
}
