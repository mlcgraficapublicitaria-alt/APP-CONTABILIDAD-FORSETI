import { join } from "path";
import { pathToFileURL } from "url";

 type TaxProfileLike = {
  selfEmployment?: boolean;
  rentalIncome?: boolean;
  investmentIncome?: boolean;
 };

export type Model303Analysis = {
  detected: {
    looksLike303: boolean;
    mentionsDeductibleVat: boolean;
    mentionsNoActivity: boolean;
    mentionsCompensation: boolean;
    mentionsReturn: boolean;
  };
  reviewPoints: Array<{
    title: string;
    detail: string;
    priority: "alta" | "media" | "baja";
  }>;
  extractedTextPreview: string[];
  disclaimer: string;
};

export async function analyzeModel303Pdf(buffer: ArrayBuffer, profile: TaxProfileLike | null): Promise<Model303Analysis> {
  const text = normalizeText(await extractPdfText(buffer));
  const lowerText = text.toLowerCase();
  const detected = {
    looksLike303: /\bmodelo\s*303\b|autoliquidacion\s+iva|impuesto sobre el valor añadido/i.test(text),
    mentionsDeductibleVat: /iva\s+deducible|cuotas?\s+soportadas?|bienes\s+corrientes|servicios\s+corrientes|bienes\s+de\s+inversion/i.test(text),
    mentionsNoActivity: /sin\s+actividad/i.test(text),
    mentionsCompensation: /compensar|a\s+compensar/i.test(text),
    mentionsReturn: /devolver|devolucion|a\s+devolver/i.test(text),
  };
  const reviewPoints = [];

  if (!detected.looksLike303) {
    reviewPoints.push({
      title: "Comprobar que el PDF sea realmente un modelo 303",
      detail: "No se han detectado señales claras de modelo 303. Revisa que el documento subido sea la autoliquidacion de IVA correcta.",
      priority: "alta" as const,
    });
  }

  if (profile?.selfEmployment) {
    reviewPoints.push({
      title: "Cruzar IVA declarado con facturas de autonomo",
      detail: "Como el perfil indica actividad por cuenta propia, conviene comparar el IVA repercutido y soportado del 303 con facturas emitidas y recibidas del periodo.",
      priority: "alta" as const,
    });
  } else {
    reviewPoints.push({
      title: "Confirmar si el contribuyente esta obligado a presentar 303",
      detail: "El perfil no marca actividad por cuenta propia. Si aun asi existe un 303, revisa si hay actividad sujeta a IVA, alquiler con IVA u otra obligacion.",
      priority: "media" as const,
    });
  }

  if (!detected.mentionsDeductibleVat) {
    reviewPoints.push({
      title: "Revisar si hay IVA soportado deducible no reflejado",
      detail: "No se detectan menciones claras a IVA deducible. Comprueba facturas de gastos afectos a la actividad, suministros, herramientas, servicios profesionales o bienes de inversion.",
      priority: "alta" as const,
    });
  }

  if (detected.mentionsNoActivity) {
    reviewPoints.push({
      title: "Modelo presentado sin actividad",
      detail: "El documento parece indicar ausencia de actividad. Verifica que no hubiera facturas emitidas, gastos deducibles o regularizaciones pendientes en ese periodo.",
      priority: "media" as const,
    });
  }

  if (detected.mentionsCompensation || detected.mentionsReturn) {
    reviewPoints.push({
      title: "Revisar saldo a compensar o devolver",
      detail: "Si el modelo refleja importe a compensar o devolver, conviene comprobar continuidad entre trimestres y que no se pierda ningun saldo pendiente.",
      priority: "media" as const,
    });
  }

  if (profile?.rentalIncome) {
    reviewPoints.push({
      title: "Comprobar alquileres con posible IVA",
      detail: "El perfil indica alquileres. Revisa si son viviendas exentas o alquileres sujetos a IVA, como locales u otros inmuebles afectos.",
      priority: "media" as const,
    });
  }

  if (profile?.investmentIncome) {
    reviewPoints.push({
      title: "Separar inversiones de actividad con IVA",
      detail: "El perfil indica inversiones. No mezcles rendimientos financieros con operaciones sujetas a IVA salvo que exista actividad economica que lo justifique.",
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
