"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CaseCreateClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/tax-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        taxpayerName: formData.get("taxpayerName"),
        taxpayerNif: formData.get("taxpayerNif"),
        fiscalYear: Number(formData.get("fiscalYear")),
      }),
    });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(result?.error ?? "No se pudo crear el expediente.");
      return;
    }
    router.push(`/renta-fiscal/cases/${result.taxCase.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-10 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">
        Nuevo expediente
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 md:grid-cols-4">
      <input name="title" placeholder="Titulo" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" required />
      <input name="taxpayerName" placeholder="Contribuyente" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" required />
      <input name="taxpayerNif" placeholder="NIF/NIE opcional" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" />
      <input name="fiscalYear" defaultValue={new Date().getFullYear()} className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" type="number" required />
      {error ? <p className="text-sm text-red-200 md:col-span-3">{error}</p> : null}
      <div className="flex gap-2 md:col-span-4">
        <button disabled={loading} className="h-10 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">{loading ? "Creando..." : "Crear"}</button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md border border-white/10 px-4 text-sm font-semibold text-zinc-200">Cancelar</button>
      </div>
    </form>
  );
}
