import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { MonthSelect } from "./month-select";
import { hasValidSession } from "@/lib/auth";
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
  { id: "pasivos", label: "PASIVOS" },
  { id: "ahorro", label: "AHORRO" },
  { id: "historial", label: "HISTORIAL DE INGRESOS ANUALES" },
];

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
  actual,
  hours,
  prevision,
  diff,
  diffHours,
  previsionHours,
  tone = "default",
}: {
  client: string;
  actual: string;
  hours: string;
  prevision: string;
  previsionHours: string;
  diff: string;
  diffHours: string;
  tone?: "default" | "spanishCheese" | "grupoDim";
}) {
  const toneClasses = {
    default: "border-white/10 bg-white/5 text-white",
    spanishCheese: "border-yellow-200/60 bg-[#fff9e7] text-yellow-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]",
    grupoDim: "border-[#6f8dff]/30 bg-[#bac9f0] text-[#04277f] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]",
  };
  const shadowClasses = {
    default: "",
    spanishCheese: "bg-[#ffe172]",
    grupoDim: "bg-[#04277f]",
  };
  const panelClasses =
    tone === "spanishCheese"
      ? "border-[#fff9e7]/60 bg-[#fff9e7]"
      : tone === "grupoDim"
        ? "border-[#bac9f0]/60 bg-[#bac9f0]"
        : "border-white/10 bg-slate-950/40";
  const labelClasses = tone === "spanishCheese" ? "text-yellow-950" : tone === "grupoDim" ? "text-[#04277f]" : "text-cyan-200";
  const mutedClasses = tone === "spanishCheese" ? "text-yellow-950/70" : tone === "grupoDim" ? "text-[#04277f]/70" : "text-zinc-400";
  const termClasses = tone === "spanishCheese" ? "text-yellow-950/60" : tone === "grupoDim" ? "text-[#04277f]/65" : "text-zinc-500";
  const valueClasses = tone === "spanishCheese" ? "text-yellow-950" : tone === "grupoDim" ? "text-[#04277f]" : "text-white";

  return (
    <div className="relative">
      {shadowClasses[tone] ? (
        <div aria-hidden="true" className={`absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-2xl opacity-90 ${shadowClasses[tone]}`} />
      ) : null}
      <div className={`relative rounded-2xl border p-5 shadow-sm ${toneClasses[tone]}`}>
        <p className="text-base font-semibold">{client}</p>
        <p className={`mt-1 min-h-10 text-sm leading-5 ${mutedClasses}`}>Facturación y horas del cliente en el mes seleccionado.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className={`rounded-xl border p-3 ${panelClasses}`}>
            <p className={`text-xs font-semibold ${labelClasses}`}>ACTUAL</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className={termClasses}>Facturación</dt>
                <dd className={`mt-1 font-medium ${valueClasses}`}>{actual || "—"}</dd>
              </div>
              <div>
                <dt className={termClasses}>Horas</dt>
                <dd className={`mt-1 font-medium ${valueClasses}`}>{hours || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className={`rounded-xl border p-3 ${panelClasses}`}>
            <p className={`text-xs font-semibold ${labelClasses}`}>PREVISION</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className={termClasses}>Facturación</dt>
                <dd className={`mt-1 font-medium ${valueClasses}`}>{prevision || "—"}</dd>
              </div>
              <div>
                <dt className={termClasses}>Horas</dt>
                <dd className={`mt-1 font-medium ${valueClasses}`}>{previsionHours || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className={`rounded-xl border p-3 ${panelClasses}`}>
            <p className={`text-xs font-semibold ${labelClasses}`}>DIFERENCIA</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className={termClasses}>Facturación</dt>
                <dd className={`mt-1 font-medium ${valueClasses}`}>{diff || "—"}</dd>
              </div>
              <div>
                <dt className={termClasses}>Horas</dt>
                <dd className={`mt-1 font-medium ${valueClasses}`}>{diffHours || "—"}</dd>
              </div>
            </dl>
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
        <p className="text-base font-semibold">MLC DESING</p>
        <p className="mt-1 min-h-10 text-sm leading-5 text-sky-950/70">Facturación por proyecto registrada para trabajos freelance del mes.</p>

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
  const normalized = value.replace(/\s/g, "").replace("€", "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) return "—";

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
        Sin año anterior disponible para comparar.
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
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-300" />
            {previousYear}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-300" />
            {year}
          </span>
        </div>
      </div>

      <div className="mt-5 grid h-44 grid-cols-12 items-end gap-2">
        {chartRows.map((entry) => (
          <div key={`${year}-${entry.month}-chart`} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-full max-w-3 rounded-t bg-violet-300/80"
                style={{ height: `${Math.max((entry.previous / maxValue) * 100, entry.previous > 0 ? 4 : 0)}%` }}
              />
              <div
                className="w-full max-w-3 rounded-t bg-cyan-300"
                style={{ height: `${Math.max((entry.current / maxValue) * 100, entry.current > 0 ? 4 : 0)}%` }}
              />
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
  entries,
  previousYear,
  previousEntries,
}: {
  year: string;
  total: string;
  average: string;
  comparison: string;
  entries: Array<{ month: string; value: string }>;
  previousYear?: string;
  previousEntries?: Array<{ month: string; value: string }>;
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

      <div className="mt-5">
        <MonthlyComparisonChart year={year} previousYear={previousYear} entries={entries} previousEntries={previousEntries} />
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

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
          <div className="relative flex min-h-[420px] flex-col justify-between px-5 py-5 sm:min-h-[460px] sm:px-7 sm:py-6 md:min-h-56 lg:min-h-64">
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

            <form action="/api/logout" method="post" className="absolute right-5 top-5 z-20 sm:right-6 sm:top-6">
              <button className="rounded-lg border border-white/15 bg-black/25 px-4 py-2 text-sm font-medium text-zinc-200 backdrop-blur transition hover:bg-white/10 hover:text-white">
                Salir
              </button>
            </form>

            <div className="relative z-10 max-w-md pr-24">
              <Image
                src="/logo-forseti.png"
                alt="Forseti"
                width={220}
                height={78}
                priority
                className="h-auto w-40 drop-shadow-[0_10px_24px_rgba(0,0,0,0.75)] sm:w-48"
              />
              <h1 className="mt-4 text-[22px] font-semibold text-white sm:text-2xl">Administracion y contabilidad</h1>
            </div>

            {data.notice ? (
              <p className="relative z-10 mt-6 max-w-3xl rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100 backdrop-blur">
                {data.notice}
              </p>
            ) : (
              <div className="relative z-10" />
            )}
          </div>
        </header>

        <section className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <nav aria-label="Secciones" className="flex flex-wrap gap-2">
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

          {selectedSection !== "historial" ? <MonthSelect months={MONTHS_2026} selectedMonth={selectedMonth} section={selectedSection ?? "mes"} /> : null}
        </section>

        {selectedSection === "mes" ? (
          <>
            <section>
              <h2 className="text-4xl font-semibold text-white">{selectedMonth}</h2>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">RESUMEN</h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 0)} toneClass={SUMMARY_CARD_TONE} title="TOTAL HORAS" description="Suma de horas trabajadas en el mes seleccionado." value={data.totalHours} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 1)} toneClass={SUMMARY_CARD_TONE} title="HORAS AL DÍA" description="Media diaria registrada para el mes seleccionado." value={data.hoursPerDay} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 2)} toneClass={SUMMARY_CARD_TONE} title="TOTAL FACTURADO" description="Importe total facturado antes restar retenciones de IVA y IRPF." value={data.totalFactura} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 3)} toneClass={SUMMARY_CARD_TONE} title="TOTAL NETO" description="Ingresos netos del mes antes de sumar pasivos adicionales." value={data.totalNeto} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 4)} toneClass={SUMMARY_CARD_TONE} title="NETO CON PASIVOS" description="Total neto incluyendo ingresos pasivos del mes." value={data.netoConPasivos} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 5)} toneClass={SUMMARY_CARD_TONE} title="GASTOS TOTALES" description="Suma total de gastos registrados para el mes." value={data.gastosTotales} />
                <KpiCard shadowClass={getSummaryShadow(selectedMonth, 6)} toneClass={SUMMARY_CARD_TONE} title="IVA TOTAL" description="Resultado total de IVA facturado menos IVA desgrabado." value={data.ivaTotal} />
                <KpiCard
                  shadowClass="bg-emerald-400"
                  toneClass="border-emerald-200/80 bg-[#d7fbe8] text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)] [&_.kpi-value]:text-emerald-950"
                  title="BENEFICIO TOTAL"
                  description="Resultado neto después de descontar gastos."
                  value={data.beneficioNeto}
                />
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">REPARTO DEL BENEFICIO TOTAL</h2>
                <p className="mt-1 text-sm text-zinc-400">Distribución del beneficio según la ficha Reparto de ingresos.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard
                  shadowClass="bg-[#d7ecff]"
                  toneClass="border-blue-200/50 bg-[#eef7ff] text-blue-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]"
                  title="AHORRO"
                  description="Parte destinada a reserva del beneficio total."
                  value={data.repartoBeneficio.ahorro}
                />
                <KpiCard
                  shadowClass="bg-[#fff0b8]"
                  toneClass="border-yellow-200/60 bg-[#fff9e7] text-yellow-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]"
                  title="INVERSION"
                  description="Parte destinada a inversión del beneficio total."
                  value={data.repartoBeneficio.inversion}
                />
                <KpiCard
                  shadowClass="bg-[#ffd8d8]"
                  toneClass="border-red-200/50 bg-[#fff1f1] text-red-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]"
                  title="OCIO"
                  description="Parte destinada a ocio del beneficio total."
                  value={data.repartoBeneficio.ocio}
                />
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
          </>
        ) : selectedSection === "pasivos" ? (
          <>
            <section>
              <h2 className="text-4xl font-semibold text-white">PASIVOS · {selectedMonth}</h2>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
              <div>
                <h2 className="text-xl font-semibold">DESGLOSE DE PASIVOS</h2>
                <p className="mt-1 text-sm text-zinc-400">Calculado por diferencia para el mes seleccionado; el desglose solo aparece cuando se ha rastreado la formula concreta de ese mes.</p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <KpiCard accent="mist" title="BASE SIN PASIVOS" description="Total neto usado como punto de partida." value={data.totalNeto} />
                <KpiCard accent="aqua" title="RESULTADO CON PASIVOS" description="Neto final despues de sumar pasivos." value={data.netoConPasivos} />
                <KpiCard accent="ice" title="TOTAL PASIVOS" description="Importe detectado por diferencia." value={data.ingresosPasivos} />
              </div>

              {data.pasivosDetalle.length > 0 ? (
                <div className="mt-6 overflow-x-auto">
                  <p className="mb-3 text-sm text-zinc-400">{data.pasivosDetalleNota}</p>
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-zinc-400">
                      <tr className="border-b border-white/10">
                        <th className="pb-3 pr-4">CONCEPTO</th>
                        <th className="pb-3 pr-4 text-right">IMPORTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pasivosDetalle.map((item) => (
                        <tr key={`${item.origen}-${item.concepto}`} className="border-b border-white/5">
                          <td className="py-3 pr-4 text-zinc-200">{item.concepto}</td>
                          <td className="py-3 pr-4 text-right font-medium text-white">{item.importe}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-6 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-zinc-400">
                  {data.pasivosDetalleNota}
                </p>
              )}
            </section>
          </>
        ) : selectedSection === "ahorro" ? (
          <>
            <section>
              <h2 className="text-4xl font-semibold text-white">AHORRO · {selectedMonth}</h2>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative">
                <div aria-hidden="true" className="absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-2xl bg-[#d7ecff] opacity-90" />
                <div className="relative rounded-2xl border border-blue-200/50 bg-[#eef7ff] p-6 text-blue-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-950/70">Reserva del mes</p>
                  <p className="mt-3 text-5xl font-semibold tracking-normal text-blue-950">{data.ahorro}</p>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-blue-950/70">
                    Importe de ahorro detectado en el resumen financiero del mes seleccionado.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-blue-200/60 bg-white/55 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-950/60">Reparto ahorro</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-950">{data.repartoBeneficio.ahorro}</p>
                    </div>
                    <div className="rounded-xl border border-blue-200/60 bg-white/55 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-950/60">Peso sobre beneficio</p>
                      <p className="mt-2 text-2xl font-semibold text-blue-950">
                        {formatPercentage(getRatio(data.repartoBeneficio.ahorro, data.beneficioNeto))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
                <h2 className="text-xl font-semibold">CONTEXTO FINANCIERO</h2>
                <p className="mt-1 text-sm text-zinc-400">Lectura rápida del ahorro frente al resultado mensual.</p>

                <div className="mt-5 grid gap-4">
                  <KpiCard accent="mist" title="BENEFICIO TOTAL" description="Resultado neto después de descontar gastos." value={data.beneficioNeto} />
                  <KpiCard accent="ice" title="TOTAL NETO" description="Ingresos netos antes de sumar pasivos adicionales." value={data.totalNeto} />
                  <KpiCard accent="aqua" title="GASTOS TOTALES" description="Suma total de gastos registrados para el mes." value={data.gastosTotales} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
              <h2 className="text-xl font-semibold">DISTRIBUCION DEL BENEFICIO</h2>
              <p className="mt-1 text-sm text-zinc-400">Reparto mensual entre ahorro, inversion y ocio.</p>

              <div className="mt-6 grid gap-5">
                <BenefitSplitBar label="AHORRO" value={data.repartoBeneficio.ahorro} total={data.beneficioNeto} className="bg-blue-300" />
                <BenefitSplitBar label="INVERSION" value={data.repartoBeneficio.inversion} total={data.beneficioNeto} className="bg-yellow-300" />
                <BenefitSplitBar label="OCIO" value={data.repartoBeneficio.ocio} total={data.beneficioNeto} className="bg-red-300" />
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
              {data.annualIncomeHistory.map((item, index) => {
                const previousItem = data.annualIncomeHistory[index - 1];

                return (
                  <AnnualIncomeHistoryCard
                    key={item.year}
                    year={item.year}
                    total={item.total}
                    average={item.average}
                    comparison={item.comparison}
                    entries={item.entries}
                    previousYear={previousItem?.year}
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
