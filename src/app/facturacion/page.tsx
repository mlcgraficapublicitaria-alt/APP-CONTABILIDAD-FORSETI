import { redirect } from "next/navigation";
import { ForsetiShellHeader } from "@/app/forseti-shell-header";
import { getDefaultMonthLabel, SECTIONS } from "@/app/navigation";
import { SectionNav } from "@/app/section-nav";
import { hasValidSession } from "@/lib/auth";
import { FacturacionClient } from "./facturacion-client";

export default async function FacturacionPage() {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  const selectedMonth = getDefaultMonthLabel();

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <ForsetiShellHeader />

        <section className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionNav sections={SECTIONS} selectedMonth={selectedMonth} activeSectionOverride="facturacion" />
        </section>

        <section className="rounded-2xl border border-[#87ba2f]/25 bg-[linear-gradient(135deg,rgba(135,186,47,0.18),rgba(15,23,42,0.38))] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b3d87d]">
                Facturacion
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Generador de facturas con plantilla visual
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                Crea facturas desde formulario, calcula base, IVA e IRPF y deja el documento preparado para impresion o guardado en PDF directamente desde Forseti.
              </p>
            </div>
          </div>
        </section>

        <FacturacionClient />
      </main>
    </div>
  );
}
