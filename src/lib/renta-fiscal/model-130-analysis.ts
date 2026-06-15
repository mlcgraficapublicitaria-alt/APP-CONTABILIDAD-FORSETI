import { join } from "path";
import { pathToFileURL } from "url";

 type TaxProfileLike = {
  selfEmployment?: boolean;
  rentalIncome?: boolean;
  investmentIncome?: boolean;
 };

export type Model130Analysis = {
  detected: {
    looksLike130: boolean;
    mentionsIncome: boolean;
    mentionsExpenses: boolean;
    mentionsWithholdings: boolean;
    mentionsPreviousPayments: boolean;
  };
  reviewPoints: Array<{
    title: string;
    detail: string;
    priority: "alta" | "media" | "baja";
  }>;
  extractedTextPreview: string[];
  disclaimer: string;
};

export async function analyzeModel130Pdf(buffer: ArrayBuffer, profile: TaxProfileLike | null): Promise<Model130Analysis> {
  const text = normalizeText(await extractPdfText(buffer));
  const detected = {
    looksLike130: /\bmodelo\s*130\b|pago\s+fraccionado|estimacion\s+directa|actividades\s+economicas/i.test(text),
    mentionsIncome: /ingresos|rendimientos?|actividad|ventas|facturas?\s+emitidas/i.test(text),
    mentionsExpenses: /gastos?|deducibles?|facturas?\s+recibidas|amortizacion|seguridad\s+social/i.test(text),
    mentionsWithholdings: /retenciones?|ingresos\s+a\s+cuenta/i.test(text),
    mentionsPreviousPayments: /pagos?\s+fraccionados?\s+anteriores|trimestres?\s+anteriores|resultado\s+anterior/i.test(text),
  };
  const reviewPoints = [];

  if (!detected.looksLike130) {
    reviewPoints.push({
      title: "Comprobar que el PDF sea realmente un modelo 130",
      detail: "No se han detectado señales claras de modelo 130. Revisa que el documento subido sea el pago fraccionado de IRPF correcto.",
      priority: "alta" as const,
    });
  }

  if (profile?.selfEmployment) {
    reviewPoints.push({
      title: "Cruzar ingresos y gastos con libros de autonomo",
      detail: "Como el perfil indica actividad por cuenta propia, compara ingresos y gastos del 130 con facturas emitidas, facturas recibidas y libros registro.",
      priority: "alta" as const,
    });
  } else {
    reviewPoints.push({
      title: "Confirmar si existe obligacion de presentar modelo 130",
      detail: "El perfil no marca actividad por cuenta propia. Si existe un 130, revisa si realmente hay actividad en estimacion directa u otra obligacion.",
      priority: "media" as const,
    });
  }

  if (!detected.mentionsExpenses) {
    reviewPoints.push({
      title: "Revisar gastos deducibles no reflejados",
      detail: "No se detectan menciones claras a gastos. Comprueba cuotas de autonomo, suministros afectos, servicios profesionales, herramientas, software, seguros y otros gastos vinculados a la actividad.",
      priority: "alta" as const,
    });
  }

  if (!detected.mentionsWithholdings) {
    reviewPoints.push({
      title: "Comprobar retenciones soportadas",
      detail: "Si hay clientes que aplican retencion en factura, revisa que esas retenciones esten consideradas para evitar pagar de mas en pagos fraccionados.",
      priority: "media" as const,
    });
  }

  if (!detected.mentionsPreviousPayments) {
    reviewPoints.push({
      title: "Comprobar continuidad entre trimestres",
      detail: "Revisa que los pagos fraccionados acumulados o anteriores cuadren con los trimestres previos y con lo que luego se declarara en renta.",
      priority: "media" as const,
    });
  }

  if (profile?.rentalIncome) {
    reviewPoints.push({
      title: "Separar alquileres de actividad economica",
      detail: "El perfil indica alquileres. Comprueba si son rendimientos inmobiliarios o actividad economica, porque no siempre pertenecen al modelo 130.",
      priority: "media" as const,
    });
  }

  if (profile?.investmentIncome) {
    reviewPoints.push({
      title: "No mezclar inversiones con actividad profesional",
      detail: "Dividendos, intereses o ganancias de inversion normalmente no forman parte del modelo 130. Revisa que no se hayan mezclado conceptos.",
      priority: "baja" as const,
    });
  }

  return {
    detected,
    reviewPoints,
    extractedTextPreview: text.split("\n").slice(0, 12),
    disclaimer:
      "Analisis preliminar. FORSETI no confirma deducciones automaticamente. Cada punto debe contrastarse con facturas, libros registro, modelo oficial y situacion fiscal real.",
  };
}

async function extractPdfText(buffer: ArrayBuffer) {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href);
  const parser = new PDFParse({ data: Buffer.from(buffer) });
  const parsed = await parser.getText({
    cellSeparator: " ",
    itemJoiner: " ",
    lineEnforce: true,
    pageJoiner: "\n",
  });
  await parser.destroy();
  return parsed.text;
}

function normalizeText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
