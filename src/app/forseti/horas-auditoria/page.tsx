const flowSteps = [
  {
    title: "1. Localizar fuentes",
    description:
      "FORSETI toma el PDF mensual de HORAS archivado en Drive y el sheet `HORAS TRABAJO 2026 - FORSETI` del mismo mes.",
  },
  {
    title: "2. Comparar horas",
    description:
      "Se cruzan días, tramos y totales para detectar descuadres reales. La salida debe ser explicativa, no un simple total global.",
  },
  {
    title: "3. Revisar diferencias",
    description:
      "La app muestra una lista de días no coincidentes con horas del PDF, horas del archivo y diferencia detectada.",
  },
  {
    title: "4. Aplicar cambios",
    description:
      "Tras confirmación del usuario, FORSETI corrige `HORAS TRABAJO 2026 - FORSETI` y deja registro de la actualización aplicada.",
  },
];

const expectedOutput = [
  "05/05/2026 — PDF: 12:53–14:11 / 15:09–18:49 | HORAS TRABAJO: 13:00–14:10 / 15:10–19:00 | diferencia: -00:02",
  "21/05/2026 — PDF: 10:52–14:45 | HORAS TRABAJO: 10:54–14:45 | diferencia: +00:02",
  "28/05/2026 — PDF: 11:46–14:41 | HORAS TRABAJO: 11:45–14:41 | diferencia: -00:01",
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-zinc-300">{children}</div>
    </section>
  );
}

export default function ForsetiHorasAuditoriaPage() {
  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="rounded-[32px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.2),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">FORSETI · HORAS · AUDITORÍA</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Comparación y aplicación de cambios</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
            Flujo previsto para comparar el PDF mensual de HORAS con <span className="font-medium text-white">HORAS TRABAJO 2026 - FORSETI</span>,
            revisar diferencias por día y aplicar correcciones sobre confirmación.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flowSteps.map((step) => (
            <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-emerald-300">{step.title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{step.description}</p>
            </div>
          ))}
        </section>

        <Card title="Salida que debe devolver FORSETI">
          <ul className="space-y-3">
            {expectedOutput.map((line) => (
              <li key={line} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-zinc-200">
                {line}
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Fuentes previstas">
            <ul className="space-y-2">
              <li>• PDF mensual de HORAS archivado en Drive.</li>
              <li>• Google Sheet <span className="font-medium text-white">HORAS TRABAJO 2026 - FORSETI</span>.</li>
              <li>• Mes objetivo: mismo mes y año en ambos soportes.</li>
            </ul>
          </Card>

          <Card title="Reglas de aplicación">
            <ul className="space-y-2">
              <li>• La comparación no modifica nada por sí sola.</li>
              <li>• La app debe mostrar primero diferencias explicativas.</li>
              <li>• Aplicar cambios solo tras orden del usuario.</li>
              <li>• Tras aplicar, conviene revalidar contra el PDF.</li>
            </ul>
          </Card>
        </div>

        <Card title="Siguiente implementación técnica">
          <div className="space-y-3">
            <p>
              Esta pantalla deja el flujo visible dentro de la app. El siguiente bloque es conectar dos acciones reales:
            </p>
            <ul className="space-y-2">
              <li>• <span className="font-medium text-white">Comparar MAYO/JUNIO/etc.</span> → genera lista de diferencias.</li>
              <li>• <span className="font-medium text-white">Aplicar cambios</span> → escribe los ajustes en el sheet tras confirmación.</li>
            </ul>
          </div>
        </Card>
      </main>
    </div>
  );
}
