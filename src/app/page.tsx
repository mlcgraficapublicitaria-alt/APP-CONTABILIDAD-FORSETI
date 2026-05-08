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
  { id: "mes", label: "MES" },
  { id: "pasivos", label: "PASIVOS" },
];

type HomeProps = {
  searchParams?: Promise<{
    seccion?: string;
    mes?: string;
  }>;
};

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
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

          <MonthSelect months={MONTHS_2026} selectedMonth={selectedMonth} section={selectedSection ?? "mes"} />
        </section>

        {selectedSection === "mes" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <KpiCard title="Total horas" value={data.totalHours} />
              <KpiCard title="Total factura" value={data.totalFactura} />
              <KpiCard title="Neto con pasivos" value={data.netoConPasivos} />
              <KpiCard title="Beneficio neto" value={data.beneficioNeto} />
              <KpiCard title="Ahorro" value={data.ahorro} />
              <KpiCard title="Total neto" value={data.totalNeto} />
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Resumen por cliente</h2>
                  <p className="text-sm text-zinc-400">Lectura inicial del bloque ACTUAL / PREVISIÓN / DIFERENCIA</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-zinc-400">
                    <tr className="border-b border-white/10">
                      <th className="pb-3 pr-4">Cliente</th>
                      <th className="pb-3 pr-4">Actual</th>
                      <th className="pb-3 pr-4">Horas</th>
                      <th className="pb-3 pr-4">Previsión</th>
                      <th className="pb-3 pr-4">Horas prev.</th>
                      <th className="pb-3 pr-4">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clientSummary.map((item) => (
                      <tr key={item.client} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-medium text-white">{item.client}</td>
                        <td className="py-3 pr-4 text-zinc-200">{item.actual}</td>
                        <td className="py-3 pr-4 text-zinc-200">{item.hours}</td>
                        <td className="py-3 pr-4 text-zinc-200">{item.prevision}</td>
                        <td className="py-3 pr-4 text-zinc-200">{item.previsionHours}</td>
                        <td className="py-3 pr-4 text-zinc-200">{item.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            <KpiCard title="Neto con pasivos" value={data.netoConPasivos} />
            <KpiCard title="Total neto" value={data.totalNeto} />
            <KpiCard title="Beneficio neto" value={data.beneficioNeto} />
          </section>
        )}
      </main>
    </div>
  );
}
