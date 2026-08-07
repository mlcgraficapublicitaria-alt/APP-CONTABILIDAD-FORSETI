const categoryRules = [
  { category: "Inteligencia artificial", pattern: /openai|chatgpt|anthropic|claude|midjourney|gemini/i },
  { category: "Luz", pattern: /iberdrola|endesa|naturgy|electricidad|energ[ií]a|kwh/i },
  { category: "Agua", pattern: /aquaservice|agua|suministro h[ií]drico/i },
  { category: "Telefonía e internet", pattern: /movistar|vodafone|orange|telefon[ií]a|fibra|internet/i },
  { category: "Software", pattern: /adobe|canva|microsoft|google workspace|software|suscripci[oó]n/i },
  { category: "Gestoría", pattern: /gestor[ií]a|asesor[ií]a|honorarios/i },
  { category: "Transporte", pattern: /repsol|cepsa|combustible|gasolina|taxi|renfe/i },
];

function isoDate(value: string) {
  const match = value.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
}

function decimal(value: string) {
  const compact = value.replace(/\s/g, "").replace(/[^0-9.,-]/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : ".";
  const normalized = compact
    .replace(decimalSeparator === "," ? /\./g : /,/g, "")
    .replace(decimalSeparator, ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractInvoiceNumber(text: string) {
  const patterns = [
    /(?:invoice|factura|ticket|documento)\s*(?:number|n[uú]mero|n[º°o.]|num\.?|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9_\-/.]{1,})/i,
    /(?:number|n[uú]mero|n[º°o.]|num\.?)\s*(?:de\s+)?(?:invoice|factura|ticket|documento)\s*[:#-]?\s*([A-Z0-9][A-Z0-9_\-/.]{1,})/i,
    /(?:invoice|factura|ticket)\s*#\s*([A-Z0-9][A-Z0-9_\-/.]{1,})/i,
  ];
  return patterns.map((pattern) => text.match(pattern)?.[1] ?? "").find(Boolean) ?? "";
}

function extractTotal(text: string) {
  const labels = "total(?:\\s+(?:a\\s+pagar|factura|due|amount))?|importe(?:\\s+total|\\s+a\\s+pagar)?|amount\\s+due|grand\\s+total|balance\\s+due";
  const patterns = [
    new RegExp(`(?:${labels})[^0-9]{0,35}(?:EUR|USD|€|\\$)?\\s*([0-9][0-9., ]{0,18}[.,][0-9]{2})`, "gi"),
    new RegExp(`([0-9][0-9., ]{0,18}[.,][0-9]{2})\\s*(?:EUR|USD|€|\\$)[^A-Za-z0-9]{0,20}(?:${labels})`, "gi"),
  ];
  const values = patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => decimal(match[1]))).filter((value) => value > 0);
  return values.at(-1) ?? 0;
}

function extractSupplier(lines: string[], text: string) {
  const labelled = text.match(/(?:proveedor|emisor|supplier|merchant|vendido\s+por|issued\s+by)\s*[:.-]\s*([^\n]{3,80})/i)?.[1]?.trim();
  if (labelled) return labelled;

  const knownProvider = [
    /OpenAI(?:,?\s+L\.?L\.?C\.?)?/i, /Anthropic(?:,?\s+PBC)?/i, /Adobe(?:\s+Systems)?/i, /Canva/i,
    /Iberdrola[^\n]*/i, /Endesa[^\n]*/i, /Naturgy[^\n]*/i, /Aquaservice[^\n]*/i,
    /Movistar[^\n]*/i, /Vodafone[^\n]*/i, /Orange[^\n]*/i,
  ].map((pattern) => text.match(pattern)?.[0]?.trim()).find(Boolean);
  if (knownProvider) return knownProvider.slice(0, 80);

  const ignored = /factura|invoice|ticket|recibo|fecha|date|cif|nif|vat|iva|total|importe|amount|p[aá]gina|page|cliente|customer|direcci[oó]n|address|n[uú]mero|number|www\.|@/i;
  const company = lines.slice(0, 25).find((line) => line.length <= 80 && /\b(?:S\.?L\.?U?|S\.?A\.?U?|L\.?L\.?C\.?|LTD\.?|LIMITED|INC\.?|PBC)\b/i.test(line) && !ignored.test(line));
  if (company) return company;
  return lines.slice(0, 18).find((line) => line.length >= 3 && line.length <= 60 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(line) && !ignored.test(line) && !/^\W+$/.test(line)) ?? "";
}

export function extractExpenseFields(text: string) {
  const cleanText = text.replace(/\r/g, "");
  const lines = cleanText.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const invoiceNumber = extractInvoiceNumber(cleanText);
  const dateSource = cleanText.match(/(?:fecha(?:\s+de\s+emisi[oó]n)?|emitida)\s*[:.-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/i)?.[1]
    ?? cleanText.match(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2}/)?.[0]
    ?? "";
  const amount = extractTotal(cleanText);
  const supplier = extractSupplier(lines, cleanText);
  const category = categoryRules.find((rule) => rule.pattern.test(cleanText))?.category ?? "Otros";
  const concept = category === "Inteligencia artificial" ? "Servicio de inteligencia artificial" : category === "Luz" ? "Suministro eléctrico" : category === "Agua" ? "Servicio de agua" : "";
  return { supplier, invoiceNumber, expenseDate: isoDate(dateSource), amount, category, concept };
}
