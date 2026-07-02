import Image from "next/image";
import { redirect } from "next/navigation";
import { MonthSelect } from "./month-select";
import { SectionNav } from "./section-nav";
import { ClientHoursEditor } from "./client-hours-editor";
import { getDefaultMonthLabel, MONTHS_2026, SECTIONS } from "./navigation";
import { hasValidSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/sheets";

type HomeProps = {
  searchParams?: Promise<{
    seccion?: string;
    mes?: string;
  }>;
};

const KPI_ACCENTS = {
  mist: "border-cyan-200/20 bg-[#123345] text-cyan-100",
  ice: "border-cyan-300/20 bg-[#153b4d] text-cyan-100",
  aqua: "border-sky-300/20 bg-[#174154] text-sky-100",
  teal: "border-teal-300/20 bg-[#16483f] text-teal-100",
  sea: "border-cyan-400/20 bg-[#0f4a57] text-cyan-100",
  deep: "border-sky-400/20 bg-[#123a5a] text-sky-100",
  glass: "border-teal-200/20 bg-[#1a4a47] text-teal-100",
  glow: "border-cyan-100/20 bg-[#1b5261] text-cyan-100",
  pastelBlue: "border-blue-200/30 bg-[#d7ecff] text-blue-950",
  pastelYellow: "border-yellow-200/40 bg-[#fff0b8] text-yellow-950",
  pastelRed: "border-red-200/35 bg-[#ffd8d8] text-red-950",
};

const SUMMARY_CARD_TONE = "border-slate-700/80 bg-[#112436] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_20px_rgba(0,0,0,0.18)] [&_.kpi-value]:text-white";

const SUMMARY_MONTH_ACCENTS: Record<string, string[]> = {
  "ENERO 2026": [
    "border-sky-200/25 bg-slate-900/85 text-white bg-sky-200 [&_.kpi-value]:text-sky-100",
    "border-sky-200/25 bg-slate-900/85 text-white bg-sky-300 [&_.kpi-value]:text-sky-100",
    "border-sky-200/25 bg-slate-900/85 text-white bg-sky-400 [&_.kpi-value]:text-sky-100",
    "border-sky-300/25 bg-slate-900/85 text-white bg-sky-200 [&_.kpi-value]:text-sky-100",
    "border-sky-300/25 bg-slate-900/85 text-white bg-sky-300 [&_.kpi-value]:text-sky-100",
    "border-sky-300/25 bg-slate-900/85 text-white bg-sky-400 [&_.kpi-value]:text-sky-100",
    "border-sky-400/25 bg-slate-900/85 text-white bg-sky-200 [&_.kpi-value]:text-sky-100",
    "border-sky-400/25 bg-slate-900/85 text-white bg-sky-300 [&_.kpi-value]:text-sky-100",
  ],
  "FEBRERO 2026": [
    "border-rose-200/25 bg-slate-900/85 text-white bg-rose-200 [&_.kpi-value]:text-rose-100",
    "border-rose-200/25 bg-slate-900/85 text-white bg-rose-300 [&_.kpi-value]:text-rose-100",
    "border-rose-200/25 bg-slate-900/85 text-white bg-rose-400 [&_.kpi-value]:text-rose-100",
    "border-rose-300/25 bg-slate-900/85 text-white bg-rose-200 [&_.kpi-value]:text-rose-100",
    "border-rose-300/25 bg-slate-900/85 text-white bg-rose-300 [&_.kpi-value]:text-rose-100",
    "border-rose-300/25 bg-slate-900/85 text-white bg-rose-400 [&_.kpi-value]:text-rose-100",
    "border-rose-400/25 bg-slate-900/85 text-white bg-rose-200 [&_.kpi-value]:text-rose-100",
    "border-rose-400/25 bg-slate-900/85 text-white bg-rose-300 [&_.kpi-value]:text-rose-100",
  ],
  "MARZO 2026": [
    "border-emerald-200/25 bg-slate-900/85 text-white bg-emerald-200 [&_.kpi-value]:text-emerald-100",
    "border-emerald-200/25 bg-slate-900/85 text-white bg-emerald-300 [&_.kpi-value]:text-emerald-100",
    "border-emerald-200/25 bg-slate-900/85 text-white bg-emerald-400 [&_.kpi-value]:text-emerald-100",
    "border-emerald-300/25 bg-slate-900/85 text-white bg-emerald-200 [&_.kpi-value]:text-emerald-100",
    "border-emerald-300/25 bg-slate-900/85 text-white bg-emerald-300 [&_.kpi-value]:text-emerald-100",
    "border-emerald-300/25 bg-slate-900/85 text-white bg-emerald-400 [&_.kpi-value]:text-emerald-100",
    "border-emerald-400/25 bg-slate-900/85 text-white bg-emerald-200 [&_.kpi-value]:text-emerald-100",
    "border-emerald-400/25 bg-slate-900/85 text-white bg-emerald-300 [&_.kpi-value]:text-emerald-100",
  ],
  "ABRIL 2026": [
    "border-violet-200/25 bg-slate-900/85 text-white bg-violet-200 [&_.kpi-value]:text-violet-100",
    "border-violet-200/25 bg-slate-900/85 text-white bg-violet-300 [&_.kpi-value]:text-violet-100",
    "border-violet-200/25 bg-slate-900/85 text-white bg-violet-400 [&_.kpi-value]:text-violet-100",
    "border-violet-300/25 bg-slate-900/85 text-white bg-violet-200 [&_.kpi-value]:text-violet-100",
    "border-violet-300/25 bg-slate-900/85 text-white bg-violet-300 [&_.kpi-value]:text-violet-100",
    "border-violet-300/25 bg-slate-900/85 text-white bg-violet-400 [&_.kpi-value]:text-violet-100",
    "border-violet-400/25 bg-slate-900/85 text-white bg-violet-200 [&_.kpi-value]:text-violet-100",
    "border-violet-400/25 bg-slate-900/85 text-white bg-violet-300 [&_.kpi-value]:text-violet-100",
  ],
  "MAYO 2026": [
    "border-orange-200/25 bg-slate-900/85 text-white bg-orange-200 [&_.kpi-value]:text-orange-100",
    "border-orange-200/25 bg-slate-900/85 text-white bg-orange-300 [&_.kpi-value]:text-orange-100",
    "border-orange-200/25 bg-slate-900/85 text-white bg-orange-400 [&_.kpi-value]:text-orange-100",
    "border-orange-300/25 bg-slate-900/85 text-white bg-orange-200 [&_.kpi-value]:text-orange-100",
    "border-orange-300/25 bg-slate-900/85 text-white bg-orange-300 [&_.kpi-value]:text-orange-100",
    "border-orange-300/25 bg-slate-900/85 text-white bg-orange-400 [&_.kpi-value]:text-orange-100",
    "border-orange-400/25 bg-slate-900/85 text-white bg-orange-200 [&_.kpi-value]:text-orange-100",
    "border-orange-400/25 bg-slate-900/85 text-white bg-orange-300 [&_.kpi-value]:text-orange-100",
  ],
  "JUNIO 2026": [
    "border-yellow-200/25 bg-slate-900/85 text-white bg-yellow-200 [&_.kpi-value]:text-yellow-100",
    "border-yellow-200/25 bg-slate-900/85 text-white bg-yellow-300 [&_.kpi-value]:text-yellow-100",
    "border-yellow-200/25 bg-slate-900/85 text-white bg-yellow-400 [&_.kpi-value]:text-yellow-100",
    "border-yellow-300/25 bg-slate-900/85 text-white bg-yellow-200 [&_.kpi-value]:text-yellow-100",
    "border-yellow-300/25 bg-slate-900/85 text-white bg-yellow-300 [&_.kpi-value]:text-yellow-100",
    "border-yellow-300/25 bg-slate-900/85 text-white bg-yellow-400 [&_.kpi-value]:text-yellow-100",
    "border-yellow-400/25 bg-slate-900/85 text-white bg-yellow-200 [&_.kpi-value]:text-yellow-100",
    "border-yellow-400/25 bg-slate-900/85 text-white bg-yellow-300 [&_.kpi-value]:text-yellow-100",
  ],
  "JULIO 2026": [
    "border-cyan-200/25 bg-slate-900/85 text-white bg-cyan-200 [&_.kpi-value]:text-cyan-100",
    "border-cyan-200/25 bg-slate-900/85 text-white bg-cyan-300 [&_.kpi-value]:text-cyan-100",
    "border-cyan-200/25 bg-slate-900/85 text-white bg-cyan-400 [&_.kpi-value]:text-cyan-100",
    "border-cyan-300/25 bg-slate-900/85 text-white bg-cyan-200 [&_.kpi-value]:text-cyan-100",
    "border-cyan-300/25 bg-slate-900/85 text-white bg-cyan-300 [&_.kpi-value]:text-cyan-100",
    "border-cyan-300/25 bg-slate-900/85 text-white bg-cyan-400 [&_.kpi-value]:text-cyan-100",
    "border-cyan-400/25 bg-slate-900/85 text-white bg-cyan-200 [&_.kpi-value]:text-cyan-100",
    "border-cyan-400/25 bg-slate-900/85 text-white bg-cyan-300 [&_.kpi-value]:text-cyan-100",
  ],
  "AGOSTO 2026": [
    "border-red-200/25 bg-slate-900/85 text-white bg-red-200 [&_.kpi-value]:text-red-100",
    "border-red-200/25 bg-slate-900/85 text-white bg-red-300 [&_.kpi-value]:text-red-100",
    "border-red-200/25 bg-slate-900/85 text-white bg-red-400 [&_.kpi-value]:text-red-100",
    "border-red-300/25 bg-slate-900/85 text-white bg-red-200 [&_.kpi-value]:text-red-100",
    "border-red-300/25 bg-slate-900/85 text-white bg-red-300 [&_.kpi-value]:text-red-100",
    "border-red-300/25 bg-slate-900/85 text-white bg-red-400 [&_.kpi-value]:text-red-100",
    "border-red-400/25 bg-slate-900/85 text-white bg-red-200 [&_.kpi-value]:text-red-100",
    "border-red-400/25 bg-slate-900/85 text-white bg-red-300 [&_.kpi-value]:text-red-100",
  ],
  "SEPTIEMBRE 2026": [
    "border-lime-200/25 bg-slate-900/85 text-white bg-lime-200 [&_.kpi-value]:text-lime-100",
    "border-lime-200/25 bg-slate-900/85 text-white bg-lime-300 [&_.kpi-value]:text-lime-100",
    "border-lime-200/25 bg-slate-900/85 text-white bg-lime-400 [&_.kpi-value]:text-lime-100",
    "border-lime-300/25 bg-slate-900/85 text-white bg-lime-200 [&_.kpi-value]:text-lime-100",
    "border-lime-300/25 bg-slate-900/85 text-white bg-lime-300 [&_.kpi-value]:text-lime-100",
    "border-lime-300/25 bg-slate-900/85 text-white bg-lime-400 [&_.kpi-value]:text-lime-100",
    "border-lime-400/25 bg-slate-900/85 text-white bg-lime-200 [&_.kpi-value]:text-lime-100",
    "border-lime-400/25 bg-slate-900/85 text-white bg-lime-300 [&_.kpi-value]:text-lime-100",
  ],
  "OCTUBRE 2026": [
    "border-amber-200/25 bg-slate-900/85 text-white bg-amber-200 [&_.kpi-value]:text-amber-100",
    "border-amber-200/25 bg-slate-900/85 text-white bg-amber-300 [&_.kpi-value]:text-amber-100",
    "border-amber-200/25 bg-slate-900/85 text-white bg-amber-400 [&_.kpi-value]:text-amber-100",
    "border-amber-300/25 bg-slate-900/85 text-white bg-amber-200 [&_.kpi-value]:text-amber-100",
    "border-amber-300/25 bg-slate-900/85 text-white bg-amber-300 [&_.kpi-value]:text-amber-100",
    "border-amber-300/25 bg-slate-900/85 text-white bg-amber-400 [&_.kpi-value]:text-amber-100",
    "border-amber-400/25 bg-slate-900/85 text-white bg-amber-200 [&_.kpi-value]:text-amber-100",
    "border-amber-400/25 bg-slate-900/85 text-white bg-amber-300 [&_.kpi-value]:text-amber-100",
  ],
  "NOVIEMBRE 2026": [
    "border-fuchsia-200/25 bg-slate-900/85 text-white bg-fuchsia-200 [&_.kpi-value]:text-fuchsia-100",
    "border-fuchsia-200/25 bg-slate-900/85 text-white bg-fuchsia-300 [&_.kpi-value]:text-fuchsia-100",
    "border-fuchsia-200/25 bg-slate-900/85 text-white bg-fuchsia-400 [&_.kpi-value]:text-fuchsia-100",
    "border-fuchsia-300/25 bg-slate-900/85 text-white bg-fuchsia-200 [&_.kpi-value]:text-fuchsia-100",
    "border-fuchsia-300/25 bg-slate-900/85 text-white bg-fuchsia-300 [&_.kpi-value]:text-fuchsia-100",
    "border-fuchsia-300/25 bg-slate-900/85 text-white bg-fuchsia-400 [&_.kpi-value]:text-fuchsia-100",
    "border-fuchsia-400/25 bg-slate-900/85 text-white bg-fuchsia-200 [&_.kpi-value]:text-fuchsia-100",
    "border-fuchsia-400/25 bg-slate-900/85 text-white bg-fuchsia-300 [&_.kpi-value]:text-fuchsia-100",
  ],
  "DICIEMBRE 2026": [
    "border-slate-200/25 bg-slate-900/85 text-white bg-slate-200 [&_.kpi-value]:text-slate-100",
    "border-slate-200/25 bg-slate-900/85 text-white bg-slate-300 [&_.kpi-value]:text-slate-100",
    "border-slate-200/25 bg-slate-900/85 text-white bg-slate-400 [&_.kpi-value]:text-slate-100",
    "border-slate-300/25 bg-slate-900/85 text-white bg-slate-200 [&_.kpi-value]:text-slate-100",
    "border-slate-300/25 bg-slate-900/85 text-white bg-slate-300 [&_.kpi-value]:text-slate-100",
    "border-slate-300/25 bg-slate-900/85 text-white bg-slate-400 [&_.kpi-value]:text-slate-100",
    "border-slate-400/25 bg-slate-900/85 text-white bg-slate-200 [&_.kpi-value]:text-slate-100",
    "border-slate-400/25 bg-slate-900/85 text-white bg-slate-300 [&_.kpi-value]:text-slate-100",
  ],
};

function KpiCard({
  title,
  description,
  value,
  accent = "aqua",
  toneClass,
  shadowClass,
}: {
  title: string;
  description: string;
  value: string;
  accent?: keyof typeof KPI_ACCENTS;
  toneClass?: string;
  shadowClass?: string;
}) {
  return (
    <div className="relative">
      {shadowClass ? (
        <div
          aria-hidden="true"
          className={`absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-2xl opacity-90 ${shadowClass}`}
        />
      ) : null}
      <div className={`relative rounded-2xl border p-5 shadow-sm ${toneClass ?? KPI_ACCENTS[accent]}`}>
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-1 min-h-10 text-sm leading-5 opacity-70">{description}</p>
        <p className="kpi-value mt-4 text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ClientBillingCard({
  client,
  month,
  actual,
  hours,
  monthlyTotalBilling,
  monthlyTotalNet,
  prevision,
  diff,
  diffHours,
  previsionHours,
  tone = "default",
}: {
  client: string;
  month: string;
  actual: string;
  hours: string;
  monthlyTotalBilling: string;
  monthlyTotalNet: string;
  prevision: string;
  previsionHours: string;
  diff: string;
  diffHours: string;
  tone?: "default" | "spanishCheese" | "grupoDim";
}) {
  const toneClasses = {
    default: "border-white/10 bg-white/5 text-white",
    spanishCheese: "border-yellow-300/35 bg-[#e8c449] text-yellow-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.18)]",
    grupoDim: "border-blue-300/20 bg-slate-950/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_20px_rgba(0,0,0,0.18)]",
  };
  const shadowClasses = {
    default: "",
    spanishCheese: "bg-[#d6ad27]",
    grupoDim: "bg-blue-400",
  };
  const headerClasses = {
    default: "border-white/10 bg-white/5 text-white",
    spanishCheese: "border-yellow-200/60 bg-[#fff5bf] text-yellow-950",
    grupoDim: "border-blue-200/40 bg-[#b7c9ff] text-[#04277f]",
  };
  const panelShadowClass = shadowClasses[tone] || "bg-[#5ab94e]";
  const labelClasses = tone === "spanishCheese" ? "text-yellow-200" : tone === "grupoDim" ? "text-blue-200" : "text-[#5ab94e]";
  const headerMutedClasses = tone === "spanishCheese" ? "text-yellow-950/70" : tone === "grupoDim" ? "text-[#04277f]/70" : "text-zinc-400";
  const termClasses = "text-zinc-400";
  const valueClasses = "text-white";
  const logoSrc = tone === "spanishCheese" ? "/logo-spanish-cheese-transparent.png" : tone === "grupoDim" ? "/logo-grupo-dim.jpeg" : null;
  const description =
    tone === "spanishCheese"
      ? "FacturaciÃ³n y horas del cliente en el mes seleccionado de Spanish Cheese, especialista en exportaciÃ³n internacional de quesos y embutidos de calidad."
      : tone === "grupoDim"
        ? "FacturaciÃ³n y horas en el mes seleccionado del cliente Grupo Dim, especialista en reformas e interiorismo."
        : "FacturaciÃ³n y horas del cliente en el mes seleccionado.";

  const metricCards = [
    {
      label: "ACTUAL",
      rows: [
        { term: "FacturaciÃ³n", value: actual },
        { term: "Horas", value: hours },
      ],
    },
    {
      label: "PREVISION",
      rows: [
        { term: "FacturaciÃ³n", value: prevision },
        { term: "Horas", value: previsionHours },
      ],
    },
    {
      label: "DIFERENCIA",
      rows: [
        { term: "FacturaciÃ³n", value: diff },
        { term: "Horas", value: diffHours },
      ],
    },
  ];

  return (
    <div className="relative">
      {shadowClasses[tone] ? (
        <div aria-hidden="true" className={`absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-2xl opacity-70 ${shadowClasses[tone]}`} />
      ) : null}
      <div className={`relative overflow-hidden rounded-2xl border shadow-sm ${toneClasses[tone]}`}>
        <div className={`relative border-b px-5 py-4 ${headerClasses[tone]}`}>
          <div className="pr-32">
            {logoSrc ? (
              <div className="flex h-[77px] w-[173px] items-center justify-start overflow-hidden">
                <Image src={logoSrc} alt={`${client} logo`} width={160} height={96} className="max-h-full w-auto object-contain" />
              </div>
            ) : (
              <p className="text-base font-semibold">{client}</p>
            )}
          </div>
          <p className={`mt-1 text-sm leading-5 ${headerMutedClasses}`}>{description}</p>
          <div className="absolute right-4 top-4">
            <ClientHoursEditor
              client={client}
              month={month}
              actual={actual}
              hours={hours}
              monthlyTotalBilling={monthlyTotalBilling}
              monthlyTotalNet={monthlyTotalNet}
              tone={tone}
            />
          </div>
        </div>
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {metricCards.map((card) => (
              <div key={`${client}-${card.label}`} className="relative">
                <div aria-hidden="true" className={`absolute inset-0 -translate-x-1 translate-y-1 rounded-2xl opacity-70 ${panelShadowClass}`} />
                <div className={`relative rounded-2xl border p-4 shadow-sm ${SUMMARY_CARD_TONE}`}>
                  <p className={`text-xs font-semibold ${labelClasses}`}>{card.label}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    {card.rows.map((row) => (
                      <div key={`${client}-${card.label}-${row.term}`}>
                        <dt className={termClasses}>{row.term}</dt>
                        <dd className={`mt-1 font-medium ${valueClasses}`}>{row.value || "â€”"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MlcdProjectBillingCard({ projects }: { projects: Array<{ client: string; project: string; price: string }> }) {
  const total = projects.reduce((sum, project) => sum + parseEuroValue(project.price), 0);
  const formattedTotal = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(total) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(total);

  return (
    <div className="relative lg:col-span-2">
      <div aria-hidden="true" className="absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-2xl bg-[#a2e0e7] opacity-90" />
      <div className="relative rounded-2xl border border-[#a2e0e7]/80 bg-[#e8fbfd] p-5 text-sky-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex h-[77px] w-[211px] items-center justify-start overflow-hidden">
              <Image src="/logo-mlc-design.png" alt="MLC Design logo" width={178} height={100} className="max-h-full w-auto object-contain" />
            </div>
            <p className="mt-1 min-h-10 text-sm leading-5 text-sky-950/70">FacturaciÃ³n por proyecto de agencia MLCdesign registrada para trabajos freelance del mes.</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/60 bg-[#e8fbfd]">
          <div className="grid grid-cols-[1fr_2.4fr_auto] gap-4 border-b border-[#a2e0e7]/70 px-4 py-3 text-xs font-semibold text-sky-950">
            <p>CLIENTE</p>
            <p>PROYECTO</p>
            <p className="text-right">PRECIO</p>
          </div>
          <div className="divide-y divide-[#a2e0e7]/60 text-sm">
            {projects.length > 0 ? (
              projects.map((project) => (
                <div key={`${project.client}-${project.project}-${project.price}`} className="grid grid-cols-[1fr_2.4fr_auto] gap-4 px-4 py-3">
                  <p className="font-medium text-sky-950">{project.client}</p>
                  <p className="text-sky-950/70">{project.project}</p>
                  <p className="text-right font-semibold text-sky-950">{project.price}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-3 text-sky-950/60">Sin proyectos facturados en este mes.</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-[#a2e0e7]/70 bg-[#c8f0f4] px-4 py-4">
            <p className="text-sm font-semibold text-sky-950">TOTAL FACTURACION NETA</p>
            <p className="text-xl font-semibold text-sky-950">{formattedTotal}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseEuroValue(value: string) {
  const normalized = value.replace(/\s/g, "").replace("â‚¬", "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEuroValue(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function ComparisonTrendIcon({ current, previous }: { current: number; previous: number }) {
  if (current === previous) {
    return <span aria-hidden="true" className="h-7 w-7" />;
  }

  const isBetter = current > previous;

  return (
    <span
      aria-label={isBetter ? "Mejor que el aÃ±o anterior" : "Peor que el aÃ±o anterior"}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-2 ${
        isBetter ? "bg-emerald-400 text-emerald-950 ring-emerald-200/80" : "bg-red-500 text-white ring-red-200/80"
      }`}
      title={isBetter ? "Mejor que el aÃ±o anterior" : "Peor que el aÃ±o anterior"}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-5 w-5" fill="none">
        <path
          d={isBetter ? "M8 12.5V3.5M8 3.5L4.5 7M8 3.5L11.5 7" : "M8 3.5V12.5M8 12.5L4.5 9M8 12.5L11.5 9"}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}

function AnnualResultIcon({ current, previous }: { current: string; previous?: string }) {
  if (!previous) {
    return null;
  }

  const currentValue = parseEuroValue(current);
  const previousValue = parseEuroValue(previous);

  if (currentValue === previousValue) {
    return (
      <span
        aria-label="Resultado igual al aÃ±o anterior"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-500 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-2 ring-zinc-200/70"
        title="Resultado igual al aÃ±o anterior"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-5 w-5" fill="none">
          <path d="M4 6.25H12M4 9.75H12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </svg>
      </span>
    );
  }

  const isPositive = currentValue > previousValue;

  return (
    <span
      aria-label={isPositive ? "Resultado anual positivo" : "Resultado anual negativo"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-2 ${
        isPositive ? "bg-emerald-400 text-emerald-950 ring-emerald-200/80" : "bg-red-500 text-white ring-red-200/80"
      }`}
      title={isPositive ? "Resultado anual positivo" : "Resultado anual negativo"}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-5 w-5" fill="none">
        <path
          d={isPositive ? "M3.5 8.4L6.6 11.5L12.8 4.5" : "M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}

function getAccumulatedSavingsUntilMonth(entries: Array<{ month: string; savings: string }>, selectedMonth: string) {
  const selectedMonthName = selectedMonth.split(" ")[0] ?? selectedMonth;
  const selectedMonthIndex = MONTHS_2026.findIndex((month) => month.startsWith(selectedMonthName));
  const entriesUntilMonth =
    selectedMonthIndex >= 0
      ? entries.filter((entry) => {
          const entryMonthIndex = MONTHS_2026.findIndex((month) => month.startsWith(entry.month));
          return entryMonthIndex >= 0 && entryMonthIndex <= selectedMonthIndex;
        })
      : entries;

  return formatEuroValue(entriesUntilMonth.reduce((sum, entry) => sum + parseEuroValue(entry.savings), 0));
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) return "â€”";

  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function getRatio(value: string, total: string) {
  const valueAmount = parseEuroValue(value);
  const totalAmount = parseEuroValue(total);

  if (totalAmount <= 0) return Number.NaN;
  return valueAmount / totalAmount;
}

function BenefitSplitBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: string;
  total: string;
  className: string;
}) {
  const ratio = getRatio(value, total);
  const width = Number.isFinite(ratio) ? Math.min(Math.max(ratio * 100, 0), 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p className="font-medium text-zinc-200">{label}</p>
        <p className="text-right font-semibold text-white">{value}</p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-500">{formatPercentage(ratio)} del beneficio total</p>
    </div>
  );
}

function AnnualSavingsChart({
  entries,
}: {
  entries: Array<{ month: string; savings: string }>;
}) {
  const values = entries.map((entry) => parseEuroValue(entry.savings));
  const maxValue = Math.max(...values, 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <div className="flex h-72 items-end gap-2 sm:gap-3">
        {entries.map((entry) => {
          const amount = parseEuroValue(entry.savings);
          const height = Math.max((amount / maxValue) * 100, amount > 0 ? 4 : 0);

          return (
            <div key={`annual-saving-chart-${entry.month}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <p className="text-center text-[10px] font-medium text-zinc-500">{entry.savings}</p>
              <div className="flex h-48 w-full items-end rounded-t-lg bg-white/5">
                <div
                  className="w-full rounded-t-lg bg-blue-300 shadow-[0_0_18px_rgba(147,197,253,0.18)]"
                  style={{ height: `${height}%` }}
                />
              </div>
              <p className="w-full truncate text-center text-[10px] font-semibold text-zinc-400">{entry.month.slice(0, 3)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SavingsHighlightCards({
  monthlySavings,
  accumulatedSavings,
  month,
  year,
  selectedMonth,
}: {
  monthlySavings: string;
  accumulatedSavings: string;
  month: string;
  year: string;
  selectedMonth: string;
}) {
  const [currentMonthName, currentYear] = month.split(" ");
  const monthlySavingsDescription = `Ahorro total del mes de ${currentMonthName ?? month} de ${currentYear ?? year}.`;
  const accumulatedSavingsDescription = `Ahorro acumulado de ENERO de ${year} hasta ${currentMonthName ?? month} de ${currentYear ?? year}.`;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="relative">
        <div aria-hidden="true" className={`absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-2xl opacity-90 ${getSummaryShadow(selectedMonth, 0)}`} />
        <div className={`relative rounded-2xl border p-6 shadow-sm ${SUMMARY_CARD_TONE}`}>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">Ahorro total del mes</p>
          <p className="kpi-value mt-3 text-5xl font-semibold tracking-normal text-white">{monthlySavings}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{monthlySavingsDescription}</p>
        </div>
      </div>

      <div className="relative">
        <div aria-hidden="true" className={`absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-2xl opacity-90 ${getSummaryShadow(selectedMonth, 1)}`} />
        <div className={`relative rounded-2xl border p-6 shadow-sm ${SUMMARY_CARD_TONE}`}>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">Ahorro total acumulado</p>
          <p className="kpi-value mt-3 text-5xl font-semibold tracking-normal text-white">{accumulatedSavings}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{accumulatedSavingsDescription}</p>
        </div>
      </div>
    </div>
  );
}

function MonthlyComparisonChart({
  year,
  previousYear,
  entries,
  previousEntries,
}: {
  year: string;
  previousYear?: string;
  entries: Array<{ month: string; value: string }>;
  previousEntries?: Array<{ month: string; value: string }>;
}) {
  if (!previousYear || !previousEntries?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-zinc-400">
        Sin aÃ±o anterior disponible para comparar.
      </div>
    );
  }

  const chartRows = entries.map((entry) => {
    const previousEntry = previousEntries.find((item) => item.month === entry.month);
    return {
      month: entry.month.slice(0, 3),
      current: parseEuroValue(entry.value),
      previous: parseEuroValue(previousEntry?.value ?? "0"),
    };
  });
  const maxValue = Math.max(...chartRows.flatMap((entry) => [entry.current, entry.previous]), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold text-white">
          {previousYear} VS {year}
        </p>
        <div className="flex gap-4 text-xs font-medium text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#1f5f26]" />
            {previousYear}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#5ab94e]" />
            {year}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:hidden">
        {chartRows.map((entry) => {
          const previousWidth = Math.max((entry.previous / maxValue) * 100, entry.previous > 0 ? 4 : 0);
          const currentWidth = Math.max((entry.current / maxValue) * 100, entry.current > 0 ? 4 : 0);

          return (
            <div key={`${year}-${entry.month}-mobile-chart`} className="grid grid-cols-[2.5rem_1fr] items-center gap-3">
              <p className="text-xs font-semibold text-zinc-400">{entry.month}</p>
              <div className="grid gap-2">
                <div className="h-8 overflow-hidden rounded-full bg-white/10">
                  <div className="flex h-full min-w-fit items-center rounded-full bg-[#1f5f26] px-2" style={{ width: `${previousWidth}%` }}>
                    <span className="whitespace-nowrap text-sm font-semibold leading-none text-white">{formatEuroValue(entry.previous)}</span>
                  </div>
                </div>
                <div className="h-8 overflow-hidden rounded-full bg-white/10">
                  <div className="flex h-full min-w-fit items-center gap-2 rounded-full bg-[#5ab94e] px-2" style={{ width: `${currentWidth}%` }}>
                    <ComparisonTrendIcon current={entry.current} previous={entry.previous} />
                    <span className="whitespace-nowrap text-sm font-semibold leading-none text-slate-950">{formatEuroValue(entry.current)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 hidden h-44 grid-cols-12 items-end gap-2 sm:grid">
        {chartRows.map((entry) => (
          <div key={`${year}-${entry.month}-chart`} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <p className="text-[9px] font-medium text-zinc-500">{formatEuroValue(entry.previous)}</p>
                <div
                  className="w-4 rounded-t bg-[#1f5f26]"
                  style={{ height: `${Math.max((entry.previous / maxValue) * 100, entry.previous > 0 ? 4 : 0)}px` }}
                />
              </div>
              <div className="flex min-w-0 flex-col items-center gap-1">
                <ComparisonTrendIcon current={entry.current} previous={entry.previous} />
                <p className="text-[9px] font-medium text-zinc-300">{formatEuroValue(entry.current)}</p>
                <div
                  className="w-4 rounded-t bg-[#5ab94e]"
                  style={{ height: `${Math.max((entry.current / maxValue) * 100, entry.current > 0 ? 4 : 0)}px` }}
                />
              </div>
            </div>
            <p className="text-[10px] font-medium text-zinc-500">{entry.month}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnualIncomeHistoryCard({
  year,
  total,
  average,
  comparison,
  monthlyComparison,
  entries,
  previousYear,
  previousTotal,
  previousEntries,
}: {
  year: string;
  total: string;
  average: string;
  comparison: string;
  monthlyComparison: string;
  entries: Array<{ month: string; value: string }>;
  previousYear?: string;
  previousTotal?: string;
  previousEntries?: Array<{ month: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <p className="text-3xl font-semibold text-white">{year}</p>
        <AnnualResultIcon current={total} previous={previousTotal} />
      </div>
      <p className="mt-1 min-h-10 text-sm leading-5 text-zinc-400">Ingresos netos anuales registrados en la ficha de seguimiento de ingresos.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-base font-semibold text-[#5ab94e]">TOTAL</p>
          <p className="mt-3 text-2xl font-semibold text-white">{total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-base font-semibold text-[#5ab94e]">MEDIA MES</p>
          <p className="mt-3 text-2xl font-semibold text-white">{average}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-base font-semibold text-[#5ab94e]">COMPARACION MENSUAL</p>
          <p className="mt-3 text-2xl font-semibold text-white">{monthlyComparison}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-base font-semibold text-[#5ab94e]">COMPARACION ANUAL</p>
          <p className="mt-3 text-2xl font-semibold text-white">{comparison}</p>
        </div>
      </div>

      <div className="mt-5">
        <MonthlyComparisonChart year={year} previousYear={previousYear} entries={entries} previousEntries={previousEntries} />
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
        <summary className="cursor-pointer text-base font-semibold text-[#5ab94e]">DESGLOSE</summary>
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
  return MONTHS_2026.find((item) => item === normalizedMonth) ?? getDefaultMonthLabel();
}

function getSelectedSection(section?: string) {
  return SECTIONS.some((item) => item.id === section) ? section : "mes";
}

function normalizeClientName(client: string) {
  return client.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function getSummaryShadow(month: string, index: number) {
  const tones = SUMMARY_MONTH_ACCENTS[month] ?? SUMMARY_MONTH_ACCENTS["MAYO 2026"];
  const matches = [...tones[index % tones.length].matchAll(/bg-(sky|rose|emerald|violet|orange|yellow|cyan|red|lime|amber|fuchsia|slate)-\d+/g)];
  return matches[matches.length - 1]?.[0] ?? "bg-orange-300";
}

export default async function Home({ searchParams }: HomeProps) {
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedMonth = getSelectedMonth(params?.mes);
  const selectedSection = getSelectedSection(params?.seccion);
  const data = await getDashboardData(selectedMonth);
  const billingClientNames = ["SPANISHCHEESE", "GRUPODIM"];
  const billingClients = data.clientSummary.filter((item) => billingClientNames.includes(normalizeClientName(item.client)));
  const accumulatedSavings = getAccumulatedSavingsUntilMonth(data.annualSavingsSummary.entries, selectedMonth);
  const passiveSectionOrder = ["SERVICIOS ALOJAMIENTOS WEB", "COMISIONADOS"];
  const passiveSections = passiveSectionOrder
    .map((section) => ({
      section,
      items: data.pasivosDetalle.filter((item) => (item.seccion ?? "OTROS") === section),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
          <div className="forseti-dashboard-hero relative flex min-h-[420px] flex-col justify-between px-5 py-5 sm:min-h-[460px] sm:px-7 sm:py-6 md:min-h-56 lg:min-h-64">
            <Image
              src="/cabecera-forseti-web-movil.jpg"
              alt=""
              fill
              priority
              sizes="(max-width: 767px) 100vw, 0px"
              className="object-cover object-center md:hidden"
            />
            <Image
              src="/cabecera-forseti-web.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 100vw, 0px"
              className="hidden object-cover object-center md:block"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1020]/55 via-[#0b1020]/18 to-[#0b1020]/82 md:bg-[linear-gradient(90deg,rgba(11,16,32,0.96)_0%,rgba(11,16,32,0.72)_34%,rgba(11,16,32,0.22)_68%,rgba(11,16,32,0.08)_100%)]" />
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-transparent via-transparent to-[#0b1020]/70 md:block" />
            <span className="forseti-hero-bg-latency forseti-dashboard-bg-latency" aria-hidden="true" />
            <span className="forseti-hero-eye-core forseti-dashboard-eye-core" aria-hidden="true" />
            <span className="forseti-hero-eye-aura forseti-dashboard-eye-aura" aria-hidden="true" />
            <span className="forseti-hero-eye-ray forseti-dashboard-eye-ray" aria-hidden="true" />

            <form action="/api/logout" method="post" className="absolute right-5 top-5 z-20 sm:right-6 sm:top-6">
              <button className="rounded-lg border border-[#5ab94e]/70 bg-[#5ab94e] px-4 py-2 text-sm font-medium text-slate-950 backdrop-blur transition hover:bg-[#6dcc62]">
                Salir
              </button>
            </form>

            <div className="relative z-10 max-w-md pr-24">
              <Image
                src="/logos-forseti.png"
                alt="Forseti"
                width={220}
                height={78}
                priority
                className="h-auto w-40 drop-shadow-[0_10px_24px_rgba(0,0,0,0.75)] sm:w-48"
              />
              <h1 className="mt-4 hidden text-2xl font-semibold text-white md:block">
                Administracion y contabilidad
              </h1>
            </div>

            <h1 className="absolute bottom-6 left-1/2 z-10 w-[calc(100%-2rem)] -translate-x-1/2 whitespace-nowrap text-center text-[clamp(18px,5.2vw,22px)] font-semibold text-white md:hidden">
              Administracion y contabilidad
            </h1>

            {data.notice ? (
              <p className="relative z-10 mt-6 max-w-3xl rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100 backdrop-blur">
                {data.notice}
              </p>
            ) : (
              <div className="relative z-10" />
            )}
          </div>
        </header>

        <section className="sticky top-0 z-30 -mx-6 flex flex-col gap-4 border-b border-white/10 bg-[#0b1020]/95 px-6 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <SectionNav sections={SECTIONS} selectedMonth={selectedMonth} />

          {selectedSection !== "historial" ? <MonthSelect months={MONTHS_2026} selectedMonth={selectedMonth} section={selectedSection ?? "mes"} /> : null}
        </section>

        {selectedSection === "mes" ? (
          <>
            <section className="flex flex-col gap-4">
              <h2 className="text-4xl font-semibold text-white">{selectedMonth}</h2>
              <div className="flex flex-wrap gap-2">
                <a href="#pasivos" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-zinc-200 transition hover:border-[#5ab94e]/60 hover:text-white">PASIVOS</a>
                <a href="#ahorro" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-zinc-200 transition hover:border-[#5ab94e]/60 hover:text-white">AHORRO</a>
                <a href="#inversion" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-zinc-200 transition hover:border-[#5ab94e]/60 hover:text-white">INVERSION</a>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">RESUMEN</h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 0)} toneClass={SUMMARY_CARD_TONE} title="TOTAL HORAS" description="Suma de horas trabajadas en el mes seleccionado." value={data.totalHours} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 1)} toneClass={SUMMARY_CARD_TONE} title="HORAS AL DÃA" description="Media diaria registrada para el mes seleccionado." value={data.hoursPerDay} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 2)} toneClass={SUMMARY_CARD_TONE} title="TOTAL FACTURADO" description="Importe total facturado antes restar retenciones de IVA y IRPF." value={data.totalFactura} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 3)} toneClass={SUMMARY_CARD_TONE} title="TOTAL NETO" description="Ingresos netos del mes antes de sumar pasivos adicionales." value={data.totalNeto} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 4)} toneClass={SUMMARY_CARD_TONE} title="NETO CON PASIVOS" description="Total neto incluyendo ingresos pasivos del mes." value={data.netoConPasivos} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 5)} toneClass={SUMMARY_CARD_TONE} title="GASTOS TOTALES" description="Suma total de gastos registrados para el mes." value={data.gastosTotales} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 6)} toneClass={SUMMARY_CARD_TONE} title="IVA TOTAL" description="Resultado total de IVA facturado menos IVA desgrabado." value={data.ivaTotal} />
                <KpiCard
                  shadowClass="bg-emerald-400"
                  toneClass="border-emerald-200/80 bg-[#d7fbe8] text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)] [&_.kpi-value]:text-emerald-950"
                  title="BENEFICIO TOTAL"
                  description="Resultado neto despuÃ©s de descontar gastos."
                  value={data.beneficioNeto}
                />
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">REPARTO DEL BENEFICIO TOTAL</h2>
                <p className="mt-1 text-sm text-zinc-400">DistribuciÃ³n del beneficio segÃºn la ficha Reparto de ingresos.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
                <div className="grid gap-5">
                  <BenefitSplitBar label="AHORRO" value={data.repartoBeneficio.ahorro} total={data.beneficioNeto} className="bg-blue-300" />
                  <BenefitSplitBar label="INVERSION" value={data.repartoBeneficio.inversion} total={data.beneficioNeto} className="bg-yellow-300" />
                  <BenefitSplitBar label="OCIO" value={data.repartoBeneficio.ocio} total={data.beneficioNeto} className="bg-red-300" />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">RESUMEN DE FACTURACION POR CLIENTE</h2>
                <p className="mt-1 text-sm text-zinc-400">FacturaciÃ³n del mes de clientes retainer activos.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {billingClients.map((item) => (
                  <ClientBillingCard
                    key={item.client}
                    client={item.client}
                    month={selectedMonth}
                    monthlyTotalBilling={data.totalFactura}
                    monthlyTotalNet={data.totalNeto}
                    tone={normalizeClientName(item.client) === "SPANISHCHEESE" ? "spanishCheese" : "grupoDim"}
                    actual={item.actual}
                    hours={item.hours}
                    prevision={item.prevision}
                    previsionHours={item.previsionHours}
                    diff={item.diff}
                    diffHours={item.diffHours}
                  />
                ))}
                <MlcdProjectBillingCard projects={data.freelanceProjects} />
              </div>
            </section>
            <section id="pasivos" className="scroll-mt-32 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
              <div>
                <h2 className="text-xl font-semibold">PASIVOS</h2>
                <p className="mt-1 text-sm text-zinc-400">Calculado por diferencia para el mes seleccionado; el desglose solo aparece cuando se ha rastreado la formula concreta de ese mes.</p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 0)} toneClass={SUMMARY_CARD_TONE} title="TOTAL PASIVOS" description="Suma total de pasivos este mes." value={data.ingresosPasivos} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 1)} toneClass={SUMMARY_CARD_TONE} title="BASE SIN PASIVOS" description="Total neto usado como punto de partida." value={data.totalNeto} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 2)} toneClass={SUMMARY_CARD_TONE} title="RESULTADO CON PASIVOS" description="Neto final despues de sumar pasivos." value={data.netoConPasivos} />
              </div>

              {data.pasivosDetalle.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-3 text-sm text-zinc-400">{data.pasivosDetalleNota}</p>
                  <div className="space-y-5">
                    {passiveSections.map((section) => (
                      <section key={section.section} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35">
                        <div className="border-b border-white/10 bg-white/5 px-4 py-3">
                          <h3 className="text-sm font-semibold tracking-[0.12em] text-cyan-100">{section.section}</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="text-left text-zinc-400">
                              <tr className="border-b border-white/10">
                                <th className="px-4 py-3">CLIENTE</th>
                                <th className="px-4 py-3">SERVICIO</th>
                                <th className="px-4 py-3">FECHA DE COBRO</th>
                                <th className="px-4 py-3 text-right">INGRESOS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.items.map((item) => (
                                <tr key={`${item.origen}-${item.concepto}-${item.fechaCobro}`} className="border-b border-white/5 last:border-0">
                                  <td className="px-4 py-3 font-medium text-zinc-100">{item.cliente ?? item.concepto}</td>
                                  <td className="max-w-xl whitespace-pre-line px-4 py-3 text-zinc-300">{item.servicio ?? item.concepto}</td>
                                  <td className="px-4 py-3 text-zinc-400">{item.fechaCobro ?? "—"}</td>
                                  <td className="px-4 py-3 text-right font-medium text-white">{item.importe}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-6 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-zinc-400">
                  {data.pasivosDetalleNota}
                </p>
              )}
            </section>

            <section id="ahorro" className="scroll-mt-32 flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">AHORRO</h2>
                <p className="mt-1 text-sm text-zinc-400">Resumen mensual y acumulado del ahorro registrado.</p>
              </div>

              <SavingsHighlightCards
                monthlySavings={data.repartoBeneficio.ahorro}
                accumulatedSavings={accumulatedSavings}
                month={selectedMonth}
                year={data.annualSavingsSummary.year}
                selectedMonth={selectedMonth}
              />

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">RESUMEN ANUAL DE AHORRO</h3>
                    <p className="mt-1 text-sm text-zinc-400">Desglose de ahorro por mes en {data.annualSavingsSummary.year}.</p>
                  </div>
                  <p className="text-sm font-medium text-[#5ab94e]">{data.annualSavingsSummary.entries.length} meses registrados</p>
                </div>

                <div className="mt-5">
                  <AnnualSavingsChart entries={data.annualSavingsSummary.entries} />
                </div>
              </div>
            </section>

            <section id="inversion" className="scroll-mt-32 flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">INVERSION</h2>
                <p className="mt-1 text-sm text-zinc-400">Distribucion de las inversiones registradas para el mes seleccionado.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard accent="deep" title="FONDO DE INVERSION" description="Capital destinado a fondos de inversion." value="—" />
                <KpiCard accent="glass" title="CRIPTOMONEDAS" description="Capital destinado a criptoactivos." value="—" />
                <KpiCard accent="glow" title="COLECCIONABLES" description="Capital destinado a piezas coleccionables." value="—" />
              </div>
            </section>
          </>
        ) : selectedSection === "historial" ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold">HISTORIAL DE INGRESOS ANUALES</h2>
              <p className="mt-1 text-sm text-zinc-400">Datos reflejados desde la pestaÃ±a Seguimiento ingresos.</p>
            </div>

            <div className="grid gap-4">
              {data.annualIncomeHistory.map((item, index) => {
                const previousItem = data.annualIncomeHistory[index - 1];

                return (
                  <AnnualIncomeHistoryCard
                    key={item.year}
                    year={item.year}
                    total={item.total}
                    average={item.average}
                    comparison={item.comparison}
                    monthlyComparison={item.monthlyComparison}
                    entries={item.entries}
                    previousYear={previousItem?.year}
                    previousTotal={previousItem?.total}
                    previousEntries={previousItem?.entries}
                  />
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
