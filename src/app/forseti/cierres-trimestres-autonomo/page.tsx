import { redirect } from "next/navigation";
import { ForsetiShellHeader } from "@/app/forseti-shell-header";
import { getDefaultMonthLabel, SECTIONS } from "@/app/navigation";
import { SectionNav } from "@/app/section-nav";
import { ToolsNav } from "@/app/tools-nav";
import { hasValidSession } from "@/lib/auth";
import { QuarterlyClosureClient } from "./quarterly-closure-client";

export default async function CierresTrimestresAutonomoPage() {
  if (!(await hasValidSession())) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <ForsetiShellHeader />
        <section className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionNav
            sections={SECTIONS}
            selectedMonth={getDefaultMonthLabel()}
            activeSectionOverride="herramientas"
          />
          <ToolsNav activeTool="cierres-trimestres-autonomo" />
        </section>

        <section className="rounded-2xl border border-[#5ab94e]/25 bg-[linear-gradient(135deg,rgba(90,185,78,0.16),rgba(15,23,42,0.38))] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#78d86d]">
            HERRAMIENTAS
          </p>
          <h1 className="mt-2 text-3xl font-semibold">CIERRES TRIMESTRES AUTONOMO</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Preparación, conciliación y revisión interna de cierres trimestrales. La presentación ante la
            AEAT y cualquier automatismo de pago quedan fuera de este módulo.
          </p>
        </section>

        <QuarterlyClosureClient />
      </main>
    </div>
  );
}
