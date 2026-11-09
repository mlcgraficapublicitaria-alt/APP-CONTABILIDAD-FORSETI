// Fuente canónica compartida para vista cliente y render server-side.

type InvoiceLineDraft = {
  id: string;
  serviceId?: string;
  articleCode: string;
  description: string;
  unitPrice: string;
  discountRate: string;
  noCost?: boolean;
  notes?: string;
};


type IssuedInvoiceLine = {
  id?: string;
  articleCode?: string;
  description: string;
  unitPrice: number;
  discountAmount?: number;
  lineTotalAmount?: number;
  notes?: string;
};

type IssuedInvoice = {
  id: string;
  documentName: string;
  series: string;
  numberLabel?: string;
  number: number;
  issueDate: string;
  clientName: string;
  clientDetails?: string;
  articleCode?: string;
  serviceDescription?: string;
  notes?: string;
  subtotalAmount?: number;
  totalDiscountRate?: number;
  totalDiscountAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  irpfRate?: number;
  irpfAmount?: number;
  totalAmount?: number;
  lines?: IssuedInvoiceLine[];
  issuer?: {
    legalName: string;
    taxId: string;
    addressLine1: string;
    postalCode: string;
    city: string;
    email: string;
    phone: string;
    bankAccount: string;
  };
};

type InvoiceSummary = {
  grossBaseAmount: number;
  totalDiscountRate: number;
  totalDiscountAmount: number;
  baseAmount: number;
  vatRate: number;
  irpfRate: number;
  vatAmount: number;
  irpfAmount: number;
  totalAmount: number;
};

type InvoiceFormState = {
  documentName: string;
  invoiceDate: string;
  invoiceSeries: string;
  invoiceNumber: string;
  articleCode: string;
  issuerName: string;
  issuerTaxId: string;
  issuerAddress: string;
  issuerPostalCode: string;
  issuerCity: string;
  issuerEmail: string;
  issuerPhone: string;
  issuerBankAccount: string;
  clientName: string;
  clientDetails: string;
  clientNameFontSize: string;
  clientDetailsFontSize: string;
  billedService: string;
  serviceNotes: string;
  baseAmount: string;
  totalDiscountRate: string;
  vatRate: string;
  irpfRate: string;
};


function parseDecimal(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function discountRateForLine(line: Pick<InvoiceLineDraft, "unitPrice" | "discountRate" | "noCost">) {
  if (line.noCost) return 0;
  return Math.min(100, Math.max(0, parseDecimal(line.discountRate)));
}

function lineDiscountAmount(line: Pick<InvoiceLineDraft, "unitPrice" | "discountRate" | "noCost">) {
  return parseDecimal(line.unitPrice) * discountRateForLine(line) / 100;
}

function lineTotalAmount(line: Pick<InvoiceLineDraft, "unitPrice" | "discountRate" | "noCost">) {
  return Math.max(0, parseDecimal(line.unitPrice) - lineDiscountAmount(line));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number, negative = false) {
  return `${negative ? "-" : ""}${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

function sanitizeDocumentName(value: string) {
  return (value || "factura")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function buildInvoiceDocumentName(form: InvoiceFormState) {
  const invoiceCode = buildInvoiceCode(form);
  const clientName = displayClientName(form.clientName.trim() || "CLIENTE");
  const invoiceDate = formatDate(form.invoiceDate) || form.invoiceDate || "Sin fecha";

  return `FACTURA N.º ${invoiceCode} - ${clientName} - ${invoiceDate}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function multilineToHtml(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function richTextHasContent(value: string) {
  return value.replace(/<[^>]*>/g, "").replaceAll("&nbsp;", " ").trim().length > 0;
}

function safeRichNoteHtml(value: string) {
  if (!value.includes("<")) return multilineToHtml(value);

  const allowedInlineTags = new Set(["b", "strong", "u"]);
  return value
    .split(/(<[^>]*>)/g)
    .map((part) => {
      if (!part.startsWith("<")) return escapeHtml(part);
      const tag = part.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
      if (!tag) return "";
      const closing = Boolean(tag[1]);
      const name = tag[2].toLowerCase();
      if (allowedInlineTags.has(name)) return `<${closing ? "/" : ""}${name}>`;
      if (name === "br" && !closing) return "<br />";
      if ((name === "div" || name === "p") && closing) return `</${name}>`;
      if (name === "div" || name === "p") {
        const alignment = part.match(/text-align\s*:\s*(left|right|center|justify)/i)?.[1]?.toLowerCase();
        return alignment ? `<${name} style="text-align: ${alignment}">` : `<${name}>`;
      }
      return "";
    })
    .join("");
}

function buildInvoiceCode(form: InvoiceFormState) {
  const series = form.invoiceSeries.trim();
  const number = form.invoiceNumber.trim();

  if (series && number) return `${series}/${number}`;
  if (series) return series;
  if (number) return number;
  return "Sin numeración";
}

function displayInvoiceNumber(invoice: Pick<IssuedInvoice, "number" | "numberLabel">) {
  return invoice.numberLabel?.trim() || String(invoice.number).padStart(6, "0");
}

function stepFormattedNumber(value: string, step: number) {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^(\D*)(\d+)(\D*)$/);
  const prefix = match?.[1] ?? "";
  const digits = match?.[2] ?? trimmedValue.replace(/\D/g, "");
  const suffix = match?.[3] ?? "";
  const width = Math.max(digits.length, 1);
  const current = Number.parseInt(digits, 10);
  const next = Math.max(1, (Number.isFinite(current) ? current : 1) + step);

  return `${prefix}${String(next).padStart(width, "0")}${suffix}`;
}

function buildIssuerCircleLines(form: InvoiceFormState) {
  return [
    form.issuerName,
    form.issuerAddress,
    form.issuerTaxId ? `N.I.F./D.N.I.: ${form.issuerTaxId}` : "",
    form.issuerPostalCode ? `C.P.: ${form.issuerPostalCode}` : "",
    form.issuerCity,
  ].filter(Boolean);
}

function buildClientCircleLines(form: InvoiceFormState) {
  if (!form.clientDetails.trim()) {
    return [form.clientName || "CLIENTE", "Dirección pendiente", "CIF pendiente"];
  }

  return [form.clientName || "CLIENTE", ...form.clientDetails.split("\n").map((item) => item.trim()).filter(Boolean)];
}

function fontSize(value: string, minimum: number, maximum: number, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}


function normalizeLookup(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase();
}

function displayClientName(value: string) {
  const normalized = normalizeLookup(value);
  if (normalized === "SPANISHCHEESE") return "SPANISH CHEESE";
  if (normalized === "GRUPODIM") return "GRUPO DIM";
  if (normalized === "MLCDESIGN" || normalized === "MLCDESING") return "MLC DESIGN";
  return value;
}


function printableLines(form: InvoiceFormState, lines?: InvoiceLineDraft[]) {
  return lines?.length ? lines : [{
    id: "legacy",
    articleCode: form.articleCode || "H",
    description: form.billedService || "SERVICIO",
    unitPrice: form.baseAmount,
    discountRate: "0",
  }];
}

function buildPrintableInvoiceDocument(
  form: InvoiceFormState,
  summary: InvoiceSummary,
  lines?: InvoiceLineDraft[],
) {
  const invoiceTitle = escapeHtml(buildInvoiceDocumentName(form));
  const invoiceCode = escapeHtml(buildInvoiceCode(form));
  const issuerCircleLines = buildIssuerCircleLines(form).map(escapeHtml).join("<br />");
  const clientDetailsLines = buildClientCircleLines(form).slice(1).map(escapeHtml).join("<br />");
  const clientNameFontSize = fontSize(form.clientNameFontSize, 11, 20, 17);
  const clientDetailsFontSize = fontSize(form.clientDetailsFontSize, 9, 18, 14);
  const serviceNotes = richTextHasContent(form.serviceNotes) ? safeRichNoteHtml(form.serviceNotes) : "";
  const issuerBank = escapeHtml(form.issuerBankAccount || "");
  const issuerPhone = escapeHtml(form.issuerPhone || "");
  const issuerEmail = escapeHtml(form.issuerEmail || "");
  const invoiceDate = escapeHtml(formatDate(form.invoiceDate) || form.invoiceDate);
  const itemRows = printableLines(form, lines).map((line) => {
    const amount = parseDecimal(line.unitPrice);
    const discount = lineDiscountAmount(line);
    const total = lineTotalAmount(line);
    const displayedAmount = line.noCost ? "S/N" : formatMoney(amount);
    const displayedDiscount = line.noCost || discount === 0 ? "" : `${formatPercent(discountRateForLine(line))} (${formatMoney(discount)})`;
    const displayedTotal = line.noCost ? "S/N" : formatMoney(total);
    return `<tr>
      <td>${escapeHtml(line.articleCode.trim() || "H")}</td>
      <td>${multilineToHtml(line.description || "SERVICIO")}${line.notes?.trim() ? `<div style="margin-top:6px;font-size:12px;color:#777;line-height:1.35;text-align:left">${multilineToHtml(line.notes)}</div>` : ""}</td>
      <td class="right">${displayedAmount}</td>
      <td class="right">${displayedDiscount}</td>
      <td class="right">${displayedTotal}</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${invoiceTitle}</title>
    <style>
      :root {
        --blue: #74c6ec;
        --ink: #222222;
        --light-ink: #d9d9d9;
        --line: #cfcfcf;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: white;
        color: var(--ink);
        font-family: Arial, Helvetica, sans-serif;
      }
      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: white;
        padding: 26mm 18mm 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16mm;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .brand-mark {
        width: 118px;
        height: 118px;
        border: 12px solid #1d1d1d;
        border-right-color: transparent;
        border-radius: 50%;
        position: relative;
      }
      .brand-mark:before,
      .brand-mark:after {
        content: "";
        position: absolute;
        background: #1d1d1d;
        transform: skewX(-34deg);
      }
      .brand-mark:before {
        left: 34px;
        top: 28px;
        width: 18px;
        height: 62px;
      }
      .brand-mark:after {
        left: 58px;
        top: 28px;
        width: 18px;
        height: 88px;
      }
      .brand-name {
        font-size: 40px;
        font-weight: 300;
        letter-spacing: 0.04em;
      }
      .brand-name strong { color: #1d1d1d; font-weight: 600; }
      .brand-name span { color: var(--blue); font-weight: 300; }
      .doc-meta {
        text-align: right;
        padding-top: 10px;
      }
      .doc-meta .date {
        color: var(--blue);
        font-size: 24px;
        margin-bottom: 24px;
      }
      .doc-meta .code {
        color: var(--light-ink);
        font-size: 46px;
        font-weight: 300;
      }
      .rule {
        margin-top: 22px;
        height: 2px;
        background: linear-gradient(90deg, #1d1d1d 0 38%, var(--blue) 38% 100%);
      }
      .circles {
        margin-top: 36px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .circle {
        width: 208px;
        min-height: 208px;
        border-radius: 50%;
        padding: 36px 22px;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1.12;
      }
      .circle.issuer {
        background: var(--blue);
        color: white;
      }
      .circle.client {
        background: #1f1f1f;
        color: white;
      }
      .circle.client .client-details { line-height: 1.12; }
      .circle .title {
        font-weight: 700;
        font-size: 18px;
        margin-bottom: 5px;
      }
      .items {
        margin-top: 76px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        text-align: left;
        font-size: 16px;
        font-weight: 400;
        padding: 0 0 14px;
      }
      td {
        font-size: 16px;
        padding: 18px 0 0;
        vertical-align: top;
      }
      .items td:first-child,
      .items td:nth-child(2) {
        text-align: left;
      }
      .divider {
        border-bottom: 1px solid var(--line);
      }
      .right { text-align: right; }
      .service-note {
        color: #666666;
        font-size: 13px;
        line-height: 1.35;
      }
      .service-note td {
        padding-top: 28px;
        border-top: 0;
        text-align: left;
      }
      .sheet.has-note .items { margin-top: 42px; }
      .sheet.has-note .summary { margin-top: 92px; }
      .sheet.has-note .bank { margin-top: 38px; }
      .sheet.has-note .footer { margin-top: 34px; }
      .summary {
        margin-top: 200px;
      }
      .summary th, .summary td {
        font-size: 16px;
      }
      .bank {
        margin-top: 64px;
        font-size: 16px;
      }
      .footer {
        margin-top: 54px;
        margin-left: -18mm;
        margin-right: -18mm;
        background: #1f1f1f;
        color: white;
        padding: 28px 18mm 32px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .footer .phone {
        font-size: 34px;
        font-weight: 700;
        line-height: 1;
      }
      .footer .rest {
        margin-top: 10px;
        font-size: 16px;
        line-height: 1.35;
      }
      .footer .mark {
        font-size: 46px;
        font-weight: 600;
        letter-spacing: 0.04em;
      }
      .footer .mark span {
        color: var(--blue);
        font-weight: 300;
      }
      @page { size: A4; margin: 0; }
    </style>
  </head>
  <body>
    <main class="sheet${serviceNotes ? " has-note" : ""}">
      <section class="header">
        <div class="brand">
          <div class="brand-mark"></div>
          <div class="brand-name"><strong>MLC</strong><span>DESIGN</span></div>
        </div>
        <div class="doc-meta">
          <div class="date">FECHA: ${invoiceDate}</div>
          <div class="code">FACTURA N.º ${invoiceCode}</div>
        </div>
      </section>

      <div class="rule"></div>

      <section class="circles">
        <div class="circle issuer">
          <div>
            <div class="title">${escapeHtml(form.issuerName || "EMISOR")}</div>
            <div>${issuerCircleLines}</div>
          </div>
        </div>
        <div class="circle client">
          <div>
            <div class="title" style="font-size:${clientNameFontSize}px">${escapeHtml(form.clientName || "CLIENTE")}</div>
            <div class="client-details" style="font-size:${clientDetailsFontSize}px">${clientDetailsLines}</div>
          </div>
        </div>
      </section>

      <section class="items">
        <table>
          <thead>
            <tr class="divider">
              <th>ARTÍCULO</th>
              <th>DESCRIPCIÓN</th>
              <th class="right">PRECIO</th>
              <th class="right">DTO.</th>
              <th class="right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            ${serviceNotes ? `<tr class="service-note"><td></td><td colspan="4">${serviceNotes}</td></tr>` : ""}
          </tbody>
        </table>
      </section>

      <section class="summary">
        <table>
          <thead>
            <tr class="divider">
              <th>TOTAL</th>
              <th class="right">%IVA</th>
              <th class="right">CUOTA IVA</th>
              ${summary.irpfRate > 0 ? '<th class="right">% IRPF</th><th class="right">CUOTA IRPF</th>' : ""}
              <th class="right">TOTAL FACTURA</th>
            </tr>
          </thead>
          <tbody>
            ${summary.totalDiscountAmount > 0 ? `<tr><td>DESCUENTO TOTAL (${formatPercent(summary.totalDiscountRate)})</td><td colspan="${summary.irpfRate > 0 ? 4 : 2}"></td><td class="right">-${formatMoney(summary.totalDiscountAmount)}</td></tr>` : ""}
            <tr>
              <td>${formatMoney(summary.baseAmount)}</td>
              <td class="right">${formatPercent(summary.vatRate)}</td>
              <td class="right">${formatMoney(summary.vatAmount)}</td>
              ${summary.irpfRate > 0 ? `<td class="right">${formatPercent(summary.irpfRate, true)}</td><td class="right">-${formatMoney(summary.irpfAmount)}</td>` : ""}
              <td class="right">${formatMoney(summary.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="bank">${issuerBank}</div>

      <footer class="footer">
        <div>
          <div class="phone">${issuerPhone}</div>
          <div class="rest">${issuerEmail}<br />www.mlcdesign.es</div>
        </div>
        <div class="mark">MLC<span>DESIGN</span></div>
      </footer>
    </main>
    <script>
      window.addEventListener("load", () => {
        const sheet = document.querySelector(".sheet");
        if (!sheet) return;
        const a4HeightPx = 1122;
        const scale = Math.min(1, a4HeightPx / sheet.scrollHeight);
        if (scale < 1) sheet.style.zoom = String(scale);
      });
    </script>
  </body>
</html>`;
}


export { buildPrintableInvoiceDocument };
export type { InvoiceFormState, InvoiceSummary, InvoiceLineDraft };
