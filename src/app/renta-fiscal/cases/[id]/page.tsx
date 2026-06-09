import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/renta-fiscal/auth";
import { buildChecklist, getCaseOrNull, serializeTaxCase, type TaxCaseChecklistItem, upsertSummary } from "@/lib/renta-fiscal/cases";
import { formatAuditAction, formatAuditEntity, formatAuditMetadata, formatCaseStatus, formatConfidence, formatDocumentStatus } from "@/lib/renta-fiscal/labels";
import { validateTaxCase } from "@/lib/renta-fiscal/validation";
import { getDefaultMonthLabel, SECTIONS } from "@/app/navigation";
import { SectionNav } from "@/app/section-nav";
import { ForsetiShellHeader } from "@/app/forseti-shell-header";
import { HelpModal, RequirementHelpButton } from "../../help-modal";
import { CaseWorkflowClient } from "./case-workflow-client";
import { Model130Analyzer } from "./model-130-analyzer";
import { Model303Analyzer } from "./model-303-analyzer";

type PageProps = {
  params: Promise<{ id: string }>;
};

type TaxCaseIssue = {
  status: "OPEN" | "RESOLVED";
};

export default async function RentaFiscalCasePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired />;

  const { id } = await params;
  const existing = await getCaseOrNull(id);
  if (!existing) redirect("/renta-fiscal");

  if (existing.issues.length === 0 && !existing.summary) {
    await validateTaxCase(id);
  }

  const [taxCase, checklist, summary] = await Promise.all([getCaseOrNull(id), buildChecklist(id), upsertSummary(id)]);
  if (!taxCase) redirect("/renta-fiscal");
  const safeCase = serializeTaxCase(taxCase);
  const missing = checklist.filter((item: TaxCaseChecklistItem) => item.required && item.status === "PENDING");
  const openIssues = taxCase.issues.filter((item: TaxCaseIssue) => item.status === "OPEN");
  const selectedMonth = getDefaultMonthLabel();

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <ForsetiShellHeader />

        <section className="sticky top-0 z-30 -mx-6 flex flex-col gap-4 border-b border-white/10 bg-[#0b1020]/95 px-6 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <SectionNav sections={SECTIONS} selectedMonth={selectedMonth} activeSectionOverride="renta-fiscal" />
        </section>

        <header className="border-b border-white/10 pb-5">
          <Link href="/renta-fiscal" className="text-sm font-medium text-emerald-300">Volver a expedientes</Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">{taxCase.reference}</p>
          <h1 className="mt-2 text-3xl font-semibold">{taxCase.title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{taxCase.taxpayerName} · NIF {safeCase.taxpayerNifMasked ?? "pendiente"} · ejercicio {taxCase.fiscalYear} · {formatCaseStatus(taxCase.status)}</p>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Documentos faltantes" value={missing.length} />
          <Metric label="Incidencias abiertas" value={openIssues.length} />
          <Metric label="Datos confirmados" value={summary.confirmedCount} />
          <Metric label="Resumen" value={formatConfidence(summary.status)} />
        </section>

        <section className="grid gap-4">
          <SectionHeading title="Analisis de modelos" description="Revisa modelos oficiales subidos al expediente antes de registrar conclusiones o datos clave." />
          <div className="grid gap-4 lg:grid-cols-2">
            <Model303Analyzer taxCaseId={taxCase.id} />
            <Model130Analyzer taxCaseId={taxCase.id} />
          </div>
        </section>

        <section className="grid gap-4">
          <SectionHeading title="Registro de documentos" description="Marca documentos recibidos y añade datos clave solo cuando tengan una fuente clara." />
          <CaseWorkflowClient taxCaseId={taxCase.id} requirements={checklist.map((item) => ({ requirementId: item.requirementId, label: item.label }))} />
        </section>

        <section className="grid gap-4">
          <SectionHeading title="Checklist documental" description="Comprueba que no falten soportes antes de dar el expediente por revisable." />
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Checklist documental">
              <div className="divide-y divide-white/10">
                {checklist.map((item) => (
                  <div key={item.requirementId} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                      <div className="mt-3">
                        <RequirementHelpButton code={item.code} label={item.label} description={item.description ?? ""} />
                      </div>
                    </div>
                    <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-200">{formatDocumentStatus(item.status)}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Faltantes e incidencias"
              help={
                <HelpModal title="Faltantes e incidencias" triggerLabel="Ayuda">
                  <p>Esta seccion muestra avisos generados por las validaciones cuando falta documentacion, hay datos pendientes o existe algun punto que conviene revisar.</p>
                  <p className="mt-3">No significa necesariamente que la renta este mal. Significa que ese punto no deberia cerrarse sin comprobarlo.</p>
                </HelpModal>
              }
            >
              {openIssues.length ? (
                <div className="space-y-3">
                  {openIssues.map((issue: (typeof openIssues)[number]) => (
                    <div key={issue.id} className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
                      <p className="text-sm font-semibold text-amber-100">{issue.title}</p>
                      <p className="mt-1 text-sm text-amber-100/80">{issue.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Sin incidencias abiertas tras la ultima validacion.</p>
              )}
            </Panel>

            <Panel
              title="Datos clave"
              help={
                <HelpModal title="Datos clave" triggerLabel="Ayuda">
                  <p>Los datos clave son informacion importante del expediente: ingresos, gastos, alquileres, donativos, vivienda, retenciones, deducciones posibles o cualquier dato que afecte a la renta.</p>
                  <p className="mt-3">Cada dato debe tener fuente y estado: pendiente, estimado o confirmado. Si no hay documento o fuente fiable, no debe marcarse como confirmado.</p>
                </HelpModal>
              }
            >
              <div className="divide-y divide-white/10">
                {taxCase.dataPoints.map((item) => (
                  <div key={item.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_1fr_auto]">
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="text-sm text-zinc-300">{item.value ?? "Pendiente"}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{formatConfidence(item.confidence)}</p>
                  </div>
                ))}
                {taxCase.dataPoints.length === 0 ? <p className="text-sm text-zinc-400">No hay datos clave registrados.</p> : null}
              </div>
            </Panel>

            <Panel
              title="Resumen preliminar"
              help={
                <HelpModal title="Resumen preliminar" triggerLabel="Ayuda">
                  <p>El resumen preliminar explica el estado del expediente: documentos faltantes, incidencias abiertas y datos confirmados, estimados o pendientes.</p>
                  <p className="mt-3">Sirve para saber si el expediente esta listo para revision final. No es una declaracion fiscal ni una recomendacion definitiva.</p>
                </HelpModal>
              }
            >
              <p className="text-sm leading-6 text-zinc-300">{summary.preliminaryNotes}</p>
              <p className="mt-4 rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm text-zinc-400">Uso interno. No presenta declaraciones, no decide criterios fiscales y no inventa datos ausentes.</p>
            </Panel>
          </div>
        </section>

        <section className="grid gap-4">
          <SectionHeading title="Auditoria final" description="Consulta la trazabilidad del expediente y las acciones realizadas durante la revision." />
          <Panel
            title="Auditoria y trazabilidad"
            help={
              <HelpModal title="Auditoria y trazabilidad" triggerLabel="Ayuda">
                <p>La auditoria es el historial del expediente. Sirve para saber que se hizo, cuando se hizo y sobre que parte del expediente.</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>Registra documentos, datos clave, validaciones y analisis de modelos.</li>
                  <li>Ayuda a revisar la trazabilidad antes de cerrar el expediente.</li>
                  <li>No calcula impuestos ni presenta declaraciones.</li>
                </ul>
              </HelpModal>
            }
          >
            <div className="divide-y divide-white/10 text-sm">
              {taxCase.auditEvents.map((event) => (
                <div key={event.id} className="grid gap-2 py-3 md:grid-cols-[0.8fr_0.8fr_1fr_1fr]">
                  <p className="font-medium text-white">{formatAuditAction(event.action)}</p>
                  <p className="text-zinc-300">{formatAuditEntity(event.entity)}</p>
                  <p className="text-zinc-400">{new Date(event.createdAt).toLocaleString("es-ES")}</p>
                  <p className="text-zinc-500">{formatAuditMetadata(event.metadata)}</p>
                </div>
              ))}
            </div>
          </Panel>
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
        <p className="text-sm leading-6 text-zinc-400">Para abrir este expediente primero debes iniciar sesion en FORSETI.</p>
        <Link href="/login" className="inline-flex h-10 w-fit items-center rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200">
          Ir al login
        </Link>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="mt-3 border-b border-emerald-300/25 pb-4">
      <h2 className="text-2xl font-extrabold uppercase tracking-[0.08em] text-white md:text-3xl">{title}</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">{description}</p>
    </header>
  );
}

function Panel({ title, children, help }: { title: string; children: React.ReactNode; help?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {help}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
