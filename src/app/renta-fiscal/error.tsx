"use client";

import Link from "next/link";

export default function RentaFiscalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#0b1020] px-5 py-8 text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-6 text-amber-100">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">FORSETI Renta Fiscal</p>
        <h1 className="text-2xl font-semibold text-white">La seccion no pudo cargar completamente</h1>
        <p className="text-sm leading-6">
          La aplicacion principal esta activa, pero Renta Fiscal ha encontrado un problema de servidor. Normalmente ocurre si la base fiscal de produccion no esta inicializada o si falta configuracion de base de datos.
        </p>
        <p className="rounded-md border border-white/10 bg-slate-950/40 p-3 text-sm text-zinc-300">
          Referencia tecnica: {error.digest ?? error.message}
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="h-10 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">
            Reintentar
          </button>
          <Link href="/" className="inline-flex h-10 items-center rounded-md border border-white/10 px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/10">
            Volver a FORSETI
          </Link>
        </div>
      </div>
    </main>
  );
}
