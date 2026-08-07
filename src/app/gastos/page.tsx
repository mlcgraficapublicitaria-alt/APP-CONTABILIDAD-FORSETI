import { redirect } from "next/navigation";
import { ForsetiShellHeader } from "@/app/forseti-shell-header";
import { getDefaultMonthLabel, SECTIONS } from "@/app/navigation";
import { SectionNav } from "@/app/section-nav";
import { ToolsNav } from "@/app/tools-nav";
import { hasValidSession } from "@/lib/auth";
import { GastosClient } from "./gastos-client";

export default async function GastosPage() {
  if (!(await hasValidSession())) redirect("/login");
  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <ForsetiShellHeader />
        <section className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionNav sections={SECTIONS} selectedMonth={getDefaultMonthLabel()} activeSectionOverride="herramientas" />
          <ToolsNav activeTool="gastos" />
        </section>
        <section className="rounded-2xl border border-[#87ba2f]/25 bg-[linear-gradient(135deg,rgba(135,186,47,0.18),rgba(15,23,42,0.38))] p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b3d87d]">Recopilación de gastos</p>
          <h1 className="mt-2 text-3xl font-semibold">Archivo mensual de facturas y justificantes</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-200">Guarda gastos de IA, suministros, Aquaservice y otros proveedores. Descarga todo el mes en ZIP o envíalo por correo.</p>
        </section>
        <GastosClient />
      </main>
    </div>
  );
}
