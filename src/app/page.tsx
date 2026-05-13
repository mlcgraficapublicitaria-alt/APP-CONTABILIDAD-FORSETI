import Link from "next/link";
import { MonthSelect } from "./month-select";
import { getDashboardData } from "@/lib/sheets";

const MONTHS_2026 = [
  "ENERO 2026",
  "FEBRERO 2026",
  "MARZO 2026",
  "ABRIL 2026",
  "MAYO 2026",
  "JUNIO 2026",
  "JULIO 2026",
  "AGOSTO 2026",
  "SEPTIEMBRE 2026",
  "OCTUBRE 2026",
  "NOVIEMBRE 2026",
  "DICIEMBRE 2026",
];

const SECTIONS = [
  { id: "mes", label: "RESUMEN DEL MES" },
  { id: "historial", label: "HISTORIAL DE INGRESOS ANUALES" },
];

type HomeProps = {
  searchParams?: Promise<{
    seccion?: string;
    mes?: string;
  }>;
};

function KpiCard({ title, description, value }: { title: string; description: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-1 min-h-10 text-sm leading-5 text-zinc-400">{description}</p>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ClientBillingCard({
  client,
  actual,
  hours,
  prevision,
  diff,
  diffHours,
  previsionHours,
}: {
  client: string;
  actual: string;
  hours: string;
  prevision: string;
  previsionHours: string;
  diff: string;
  diffHours: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
      <p className="text-base font-semibold text-white">{client}</p>
      <p className="mt-1 min-h-10 text-sm leading-5 text-zinc-400">Facturación y horas del cliente en el mes seleccionado.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs font-semibold text-cyan-200">ACTUAL</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Facturación</dt>
              <dd className="mt-1 font-medium text-white">{actual || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Horas</dt>
              <dd className="mt-1 font-medium text-white">{hours || "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs font-semibold text-cyan-200">PREVISION</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Facturación</dt>
              <dd className="mt-1 font-medium text-white">{prevision || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Horas</dt>
              <dd className="mt-1 font-medium text-white">{previsionHours || "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <p className="text-xs font-semibold text-cyan-200">DIFERENCIA</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Facturación</dt>
              <dd className="mt-1 font-medium text-white">{diff || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Horas</dt>
              <dd className="mt-1 font-medium text-white">{diffHours || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function AnnualIncomeHistoryCard({
  year,
  total,
  average,
  comparison,
  entries,
}: {
  year: string;
  total: string;
  average: string;
  comparison: string;
  entries: Array<{ month: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
      <p className="text-3xl font-semibold text-white">{year}</p>
      <p className="mt-1 min-h-10 text-sm leading-5 text-zinc-400">Ingresos netos anuales registrados en la ficha de seguimiento de ingresos.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-base font-semibold text-cyan-200">TOTAL</p>
          <p className="mt-3 text-2xl font-semibold text-white">{total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-base font-semibold text-cyan-200">MEDIA MES</p>
          <p className="mt-3 text-2xl font-semibold text-white">{average}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-base font-semibold text-cyan-200">COMPARACION</p>
          <p className="mt-3 text-2xl font-semibold text-white">{comparison}</p>
        </div>
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <summary className="cursor-pointer text-base font-semibold text-cyan-200">DESGLOSE</summary>
        <dl className="mt-3 divide-y divide-white/10 text-sm">
          {entries.map((entry) => (
            <div key={`${year}-${entry.month}`} className="flex items-center justify-between gap-4 py-2">
              <dt className="font-medium text-zinc-300">{entry.month}</dt>
              <dd className="text-right font-semibold text-white">{entry.value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function getSelectedMonth(month?: string) {
  const normalizedMonth = month?.toUpperCase();
  return MONTHS_2026.find((item) => item === normalizedMonth) ?? "MAYO 2026";
}

function getSelectedSection(section?: string) {
  return SECTIONS.some((item) => item.id === section) ? section : "mes";
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const selectedMonth = getSelectedMonth(params?.mes);
  const selectedSection = getSelectedSection(params?.seccion);
  const data = await getDashboardData(selectedMonth);
  const billingClients = data.clientSummary.filter((item) => ["SPANISH-CHEESE", "GRUPO DIM"].includes(item.client));

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">APP CONTABILIDAD MLCDESIGN</p>
          <h1 className="text-3xl font-semibold">Dashboard inicial</h1>
          <p className="text-zinc-400">Fuente actual: Google Sheet HORAS TRABAJO 2026 - FORSETI · Mes: {data.month}</p>
          {data.notice ? (
            <p className="max-w-3xl rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {data.notice}
            </p>
          ) : null}
        </header>

        <section className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <nav aria-label="Secciones" className="flex gap-2">
            {SECTIONS.map((section) => {
              const isActive = section.id === selectedSection;

              return (
                <Link
                  key={section.id}
                  href={`/?seccion=${section.id}&mes=${encodeURIComponent(selectedMonth)}`}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-300 text-slate-950 shadow-sm shadow-cyan-950/20"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {section.label}
                </Link>
              );
            })}
          </nav>

          {selectedSection === "mes" ? <MonthSelect months={MONTHS_2026} selectedMonth={selectedMonth} section={selectedSection} /> : null}
        </section>

        {selectedSection === "mes" ? (
          <>
            <section>
              <h2 className="text-4xl font-semibold text-white">{selectedMonth}</h2>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <KpiCard title="TOTAL HORAS" description="Suma de horas trabajadas en el mes seleccionado." value={data.totalHours} />
              <KpiCard title="HORAS AL DÍA" description="Media diaria registrada para el mes seleccionado." value={data.hoursPerDay} />
              <KpiCard title="TOTAL FACTURADO" description="Importe total facturado antes restar retenciones de IVA y IRPF." value={data.totalFactura} />
              <KpiCard title="TOTAL NETO" description="Ingresos netos del mes antes de sumar pasivos adicionales." value={data.totalNeto} />
              <KpiCard title="NETO CON PASIVOS" description="Total neto incluyendo ingresos pasivos del mes." value={data.netoConPasivos} />
              <KpiCard title="GASTOS TOTALES" description="Suma total de gastos registrados para el mes." value={data.gastosTotales} />
              <KpiCard title="IVA TOTAL" description="Resultado total de IVA facturado menos IVA desgrabado." value={data.ivaTotal} />
              <KpiCard title="BENEFICIO TOTAL" description="Resultado neto después de descontar gastos." value={data.beneficioNeto} />
            </section>

            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">REPARTO DEL BENEFICIO TOTAL</h2>
                <p className="mt-1 text-sm text-zinc-400">Distribución del beneficio según la ficha Reparto de ingresos.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard title="AHORRO" description="Parte destinada a reserva del beneficio total." value={data.repartoBeneficio.ahorro} />
                <KpiCard title="INVERSION" description="Parte destinada a inversión del beneficio total." value={data.repartoBeneficio.inversion} />
                <KpiCard title="OCIO" description="Parte destinada a ocio del beneficio total." value={data.repartoBeneficio.ocio} />
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">RESUMEN DE FACTURACION POR CLIENTE</h2>
                <p className="mt-1 text-sm text-zinc-400">Facturación del mes de clientes retainer activos.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {billingClients.map((item) => (
                  <ClientBillingCard
                    key={item.client}
                    client={item.client}
                    actual={item.actual}
                    hours={item.hours}
                    prevision={item.prevision}
                    previsionHours={item.previsionHours}
                    diff={item.diff}
                    diffHours={item.diffHours}
                  />
                ))}
              </div>
            </section>
          </>
        ) : selectedSection === "historial" ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold">HISTORIAL DE INGRESOS ANUALES</h2>
              <p className="mt-1 text-sm text-zinc-400">Datos reflejados desde la pestaña Seguimiento ingresos.</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {data.annualIncomeHistory.map((item) => (
                <AnnualIncomeHistoryCard
                  key={item.year}
                  year={item.year}
                  total={item.total}
                  average={item.average}
                  comparison={item.comparison}
                  entries={item.entries}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
