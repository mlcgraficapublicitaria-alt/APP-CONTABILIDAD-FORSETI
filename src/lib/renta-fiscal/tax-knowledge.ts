export type TaxKnowledgeSource = {
  id: string;
  title: string;
  description: string;
  url: string;
};

export const TAX_KNOWLEDGE_SOURCES: TaxKnowledgeSource[] = [
  {
    id: "deducciones-generales-autonomicas",
    title: "Deducciones generales y autonomicas",
    description: "Fuente oficial para revisar deducciones aplicables segun ejercicio y comunidad autonoma.",
    url: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota/introduccion/deducciones-generales-autonomicas-aplicables.html",
  },
  {
    id: "modelo-303",
    title: "Modelo 303 de IVA",
    description: "Instrucciones oficiales para revisar autoliquidaciones de IVA.",
    url: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026/instrucciones-02-12-2t-4t-2026.html",
  },
  {
    id: "modelo-130",
    title: "Modelo 130 de IRPF",
    description: "Instrucciones oficiales para pagos fraccionados de empresarios y profesionales.",
    url: "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html",
  },
];
