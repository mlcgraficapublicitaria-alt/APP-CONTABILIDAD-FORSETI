"use client";

import Link from "next/link";
import { useState } from "react";

type ArchivedCase = {
  id: string;
  reference: string;
  title: string;
  taxpayerName: string;
  taxpayerNifMasked: string | null;
  statusLabel: string;
  fiscalYear: number;
  openIssues: number;
};

type CaseArchiveClientProps = {
  cases: ArchivedCase[];
};

export function CaseArchiveClient({ cases }: CaseArchiveClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-10 rounded-md border border-emerald-300/50 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/10"
        aria-expanded={open}
      >
        {open ? "Ocultar anteriores" : "Anteriores"}
      </button>
      <p className="flex h-10 items-center text-sm text-zinc-400">{cases.length} expediente(s) guardado(s)</p>

      {open ? (
        <section className="grid w-full basis-full gap-3">
          {cases.map((item) => (
            <article key={item.id} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1.3fr_0.7fr_0.5fr_0.5fr_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold text-emerald-200">{item.reference}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{item.taxpayerName} · NIF {item.taxpayerNifMasked ?? "pendiente"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Estado</p>
                <p className="mt-1 text-sm font-medium text-zinc-100">{item.statusLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Ejercicio</p>
                <p className="mt-1 text-sm font-medium text-zinc-100">{item.fiscalYear}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Incidencias</p>
                <p className="mt-1 text-sm font-medium text-zinc-100">{item.openIssues}</p>
              </div>
              <Link href={`/renta-fiscal/cases/${item.id}`} className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">
                Entrar
              </Link>
            </article>
          ))}
          {cases.length === 0 ? <p className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-400">No hay expedientes anteriores.</p> : null}
        </section>
      ) : null}
    </>
  );
}
