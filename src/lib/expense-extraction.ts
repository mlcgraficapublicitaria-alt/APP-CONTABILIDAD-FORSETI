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
  const normalized = value.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractExpenseFields(text: string) {
  const cleanText = text.replace(/\r/g, "");
  const lines = cleanText.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const invoiceNumber = cleanText.match(/(?:factura|ticket|documento)\s*(?:n[º°o.]|n[uú]mero|num\.?)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9_\-/.]{2,})/i)?.[1] ?? "";
  const dateSource = cleanText.match(/(?:fecha(?:\s+de\s+emisi[oó]n)?|emitida)\s*[:.-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/i)?.[1]
    ?? cleanText.match(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2}/)?.[0]
    ?? "";
  const totalMatches = [...cleanText.matchAll(/(?:total(?:\s+a\s+pagar)?|importe\s+total)\s*[:€ ]*([0-9. ]+,[0-9]{2}|[0-9, ]+\.[0-9]{2})/gi)];
  const amount = totalMatches.length ? decimal(totalMatches.at(-1)?.[1] ?? "0") : 0;
  const supplier = lines.find((line) => line.length >= 3 && line.length <= 80 && !/factura|ticket|fecha|cif|nif|total/i.test(line)) ?? "";
  const category = categoryRules.find((rule) => rule.pattern.test(cleanText))?.category ?? "Otros";
  const concept = category === "Inteligencia artificial" ? "Servicio de inteligencia artificial" : category === "Luz" ? "Suministro eléctrico" : category === "Agua" ? "Servicio de agua" : "";
  return { supplier, invoiceNumber, expenseDate: isoDate(dateSource), amount, category, concept };
}
