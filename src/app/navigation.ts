export const MONTHS_2026 = [
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

const MONTH_NAMES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

export function getCurrentMonthLabel() {
  const today = new Date();
  return `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
}

export function getDefaultMonthLabel() {
  const currentMonth = getCurrentMonthLabel();
  return MONTHS_2026.find((month) => month === currentMonth) ?? currentMonth;
}

export const SECTIONS = [
  { id: "mes", label: "RESUMEN DEL MES" },
  { id: "pasivos", label: "PASIVOS" },
  { id: "ahorro", label: "AHORRO" },
  { id: "inversion", label: "INVERSION" },
  { id: "historial", label: "HISTORIAL DE INGRESOS ANUALES" },
  { id: "horas-auditoria", label: "AUDITORIA DE HORAS", href: "/forseti/horas-auditoria" },
  { id: "renta-fiscal", label: "RENTA FISCAL", href: "/renta-fiscal" },
];
