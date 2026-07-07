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
  { id: "historial", label: "RESÚMENES ANUALES" },
  { id: "herramientas", label: "HERRAMIENTAS" },
];

export const TOOLS = [
  {
    id: "horas-auditoria",
    label: "Auditoría de horas",
    title: "Comparador de horas",
    description: "Revisar diferencias por día, tramos y total antes de aplicar cambios sobre HORAS TRABAJO 2026.",
    href: "/forseti/horas-auditoria",
  },
  {
    id: "facturacion",
    label: "Facturación",
    title: "Generador de facturas",
    description: "Crear facturas desde formulario, calcular base, IVA e IRPF y preparar el documento para imprimir o guardar.",
    href: "/facturacion",
  },
  {
    id: "presupuestos",
    label: "Presupuestos",
    title: "Generador de presupuestos",
    description: "Crear presupuestos desde formulario, calcular base, IVA e IRPF y preparar el documento para imprimir o guardar.",
    href: "/presupuestos",
  },
];
