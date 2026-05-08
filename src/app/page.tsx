import { getDashboardData } from "@/lib/sheets";

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">APP CONTABILIDAD MLCDESIGN</p>
          <h1 className="text-3xl font-semibold">Dashboard inicial</h1>
          <p className="text-zinc-400">Fuente actual: Google Sheet HORAS TRABAJO 2026 - FORSETI · Mes: {data.month}</p>
        </header>

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
      </main>
    </div>
  );
}
