export type TaxKnowledgeSource = {
  id: string;
  title: string;
  description: string;
  url: string;
  updateSummary: string;
  reviewItems: string[];
};

export const TAX_KNOWLEDGE_SOURCES: TaxKnowledgeSource[] = [
  {
    id: "deducciones-generales-autonomicas",
    title: "Deducciones generales y autonomicas",
    description: "Fuente oficial para revisar deducciones aplicables según ejercicio y comunidad autónoma.",
    url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota/introduccion/deducciones-generales-autonomicas-aplicables.html",
    updateSummary: "Comprobar deducciones estatales y autonomicas vigentes antes de marcar una deduccion como aplicable.",
    reviewItems: ["Ejercicio fiscal", "Comunidad autónoma", "Situación familiar", "Vivienda", "Donativos, discapacidad o familia numerosa"],
  },
  {
    id: "modelo-303",
    title: "Modelo 303 de IVA",
    description: "Instrucciones oficiales para revisar autoliquidaciones de IVA.",
    url: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026/instrucciones-02-12-2t-4t-2026.html",
    updateSummary: "Comprobar instrucciones del IVA y casillas relevantes antes de cruzar el modelo 303 con gastos, facturas e IVA deducible.",
    reviewItems: ["IVA devengado", "IVA deducible", "Resultado a ingresar, compensar o devolver", "Coherencia con facturas", "Trimestres revisados"],
  },
  {
    id: "modelo-130",
    title: "Modelo 130 de IRPF",
    description: "Instrucciones oficiales para pagos fraccionados de empresarios y profesionales.",
    url: "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html",
    updateSummary: "Comprobar instrucciones de pagos fraccionados de IRPF antes de revisar ingresos, gastos, retenciones y pagos anteriores.",
    reviewItems: ["Ingresos de actividad", "Gastos deducibles", "Retenciones soportadas", "Pagos fraccionados anteriores", "Obligación según perfil"],
  },
];
