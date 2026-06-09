import Link from "next/link";
import { getCurrentUser } from "@/lib/renta-fiscal/auth";
import { prisma } from "@/lib/renta-fiscal/prisma";
import { formatCaseStatus, formatUserRole } from "@/lib/renta-fiscal/labels";
import { maskEmail, maskNif } from "@/lib/renta-fiscal/security";
import { getDefaultMonthLabel, SECTIONS } from "@/app/navigation";
import { SectionNav } from "@/app/section-nav";
import { ForsetiShellHeader } from "@/app/forseti-shell-header";
import { CaseArchiveClient } from "./case-archive-client";
import { CaseCreateClient } from "./case-create-client";
import { DashboardHelpButtons } from "./help-modal";
import { TaxKnowledgeRefresh } from "./tax-knowledge-refresh";

type DashboardCase = {
  id: string;
  reference: string;
  title: string;
  taxpayerName: string;
  taxpayerNif: string | null;
  status: "DRAFT" | "IN_REVIEW" | "READY" | "CLOSED";
  fiscalYear: number;
  issues: Array<{ id: string }>;
};

export default async function RentaFiscalDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired />;

  const casesResult = await getDashboardCases();
  const selectedMonth = getDefaultMonthLabel();
  if (!casesResult.ok) return <RentaFiscalDatabaseUnavailable error={casesResult.error} selectedMonth={selectedMonth} />;
  const cases = casesResult.cases;
  const archivedCases = cases.map((item: DashboardCase) => {
    return {
      id: item.id,
      reference: item.reference,
      title: item.title,
      taxpayerName: item.taxpayerName,
      taxpayerNifMasked: maskNif(item.taxpayerNif),
      statusLabel: formatCaseStatus(item.status),
      fiscalYear: item.fiscalYear,
      openIssues: item.issues.length,
    };
  });

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <ForsetiShellHeader />

        <section className="sticky top-0 z-30 -mx-6 flex flex-col gap-4 border-b border-white/10 bg-[#0b1020]/95 px-6 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <SectionNav sections={SECTIONS} selectedMonth={selectedMonth} activeSectionOverride="renta-fiscal" />
        </section>

        <TaxKnowledgeRefresh />

        <section className="grid gap-4">
          <header className="mt-3 border-b border-emerald-300/25 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">FORSETI Renta Fiscal</p>
            <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-[0.08em] text-white md:text-3xl">Expedientes fiscales</h2>
            <p className="mt-2 text-sm text-zinc-400">Sesion: {maskEmail(user.email)} · permiso {formatUserRole(user.role)}</p>
          </header>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <CaseCreateClient />
                <CaseArchiveClient cases={archivedCases} />
              </div>
            </div>
          </div>
        </section>

        <DashboardHelpButtons />
      </main>
    </div>
  );
}

async function getDashboardCases() {
  try {
    const cases = await prisma.taxCase.findMany({
      orderBy: { updatedAt: "desc" },
      include: { summary: true, issues: { where: { status: "OPEN" } } },
    });
    return { ok: true as const, cases };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Error desconocido de base de datos." };
  }
}

function RentaFiscalDatabaseUnavailable({ error, selectedMonth }: { error: string; selectedMonth: string }) {
  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <ForsetiShellHeader />
        <section className="sticky top-0 z-30 -mx-6 flex flex-col gap-4 border-b border-white/10 bg-[#0b1020]/95 px-6 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <SectionNav sections={SECTIONS} selectedMonth={selectedMonth} activeSectionOverride="renta-fiscal" />
        </section>
        <section className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-5 text-amber-100">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">FORSETI Renta Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Base fiscal pendiente de inicializar</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6">
            La seccion esta cargada, pero la base de datos de Renta Fiscal no esta disponible en este servidor. Hay que revisar `DATABASE_URL` y ejecutar las migraciones/seed en produccion.
          </p>
          <p className="mt-3 rounded-md border border-white/10 bg-slate-950/40 p-3 text-sm text-zinc-300">{error}</p>
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
