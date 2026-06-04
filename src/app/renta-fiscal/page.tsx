import Link from "next/link";
import { getCurrentUser } from "@/lib/renta-fiscal/auth";
import { prisma } from "@/lib/renta-fiscal/prisma";
import { serializeTaxCase } from "@/lib/renta-fiscal/cases";
import { formatCaseStatus, formatUserRole } from "@/lib/renta-fiscal/labels";
import { maskEmail } from "@/lib/renta-fiscal/security";
import { getDefaultMonthLabel, SECTIONS } from "@/app/navigation";
import { SectionNav } from "@/app/section-nav";
import { ForsetiShellHeader } from "@/app/forseti-shell-header";
import { CaseCreateClient } from "./case-create-client";
import { DashboardHelpButtons } from "./help-modal";
import { TaxKnowledgeRefresh } from "./tax-knowledge-refresh";

export default async function RentaFiscalDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired />;

  const cases = await prisma.taxCase.findMany({
    orderBy: { updatedAt: "desc" },
    include: { summary: true, issues: { where: { status: "OPEN" } } },
  });
  const selectedMonth = getDefaultMonthLabel();

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <ForsetiShellHeader />

        <section className="sticky top-0 z-30 -mx-6 flex flex-col gap-4 border-b border-white/10 bg-[#0b1020]/95 px-6 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <SectionNav sections={SECTIONS} selectedMonth={selectedMonth} activeSectionOverride="renta-fiscal" />
        </section>

        <section className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">FORSETI Renta Fiscal</p>
            <h1 className="mt-2 text-3xl font-semibold">Expedientes fiscales</h1>
            <p className="mt-2 text-sm text-zinc-400">Sesión: {maskEmail(user.email)} · permiso {formatUserRole(user.role)}</p>
          </div>
          <CaseCreateClient />
        </section>

        <DashboardHelpButtons />

        <TaxKnowledgeRefresh />

        <section className="grid gap-3">
          {cases.map((item) => {
            const taxCase = serializeTaxCase(item);
            return (
              <Link key={item.id} href={`/renta-fiscal/cases/${item.id}`} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-emerald-300/40 md:grid-cols-[1.3fr_0.7fr_0.5fr_0.5fr]">
                <div>
                  <p className="text-sm font-semibold text-emerald-200">{item.reference}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{item.title}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{item.taxpayerName} · NIF {taxCase.taxpayerNifMasked ?? "pendiente"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Estado</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{formatCaseStatus(item.status)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Ejercicio</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{item.fiscalYear}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Incidencias</p>
                  <p className="mt-1 text-sm font-medium text-zinc-100">{item.issues.length}</p>
                </div>
              </Link>
            );
          })}
          {cases.length === 0 ? <p className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-400">No hay expedientes. Crea el primero para iniciar el flujo minimo.</p> : null}
        </section>
      </main>
    </div>
  );
}

function LoginRequired() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-5 py-8 text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">FORSETI Renta Fiscal</p>
        <h1 className="text-2xl font-semibold">Sesion no iniciada</h1>
        <p className="text-sm leading-6 text-zinc-400">Para entrar en Renta Fiscal primero debes iniciar sesion en FORSETI.</p>
        <Link href="/login" className="inline-flex h-10 w-fit items-center rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">
          Ir al login
        </Link>
      </div>
    </main>
  );
}
