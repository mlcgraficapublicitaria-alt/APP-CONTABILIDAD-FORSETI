"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type SavedInvoiceClient = {
  id: string;
  legalName: string;
  details: string;
  nameFontSize: number;
  detailsFontSize: number;
};

type SavedBankAccount = {
  id: string;
  value: string;
};

type SavedService = {
  id: string;
  name: string;
  articleCode: string;
};

type DriveFolderOption = {
  id: string;
  name: string;
  webViewLink?: string;
};

type IssuedInvoice = {
  id: string;
  documentName: string;
  series: string;
  number: number;
  issueDate: string;
  clientName: string;
  clientDetails?: string;
  articleCode?: string;
  serviceDescription?: string;
  subtotalAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  irpfRate?: number;
  irpfAmount?: number;
  totalAmount?: number;
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
  baseAmount: string;
  vatRate: string;
  irpfRate: string;
};

const INITIAL_STATE: InvoiceFormState = {
  documentName: "Factura MLC Design",
  invoiceDate: new Date().toISOString().slice(0, 10),
  invoiceSeries: "A",
  invoiceNumber: "000433",
  articleCode: "H",
  issuerName: "MARIANO LUJAN CANOVAS",
  issuerTaxId: "47078608-T",
  issuerAddress: "C/ Dionisio Guardiola, 55",
  issuerPostalCode: "02003",
  issuerCity: "ALBACETE",
  issuerEmail: "creativo@mlcdesign.es",
  issuerPhone: "639 350 843",
  issuerBankAccount: "GLOBAL CAJA: ES15 3190 0091 1504 0253 9910",
  clientName: "",
  clientDetails: "",
  clientNameFontSize: "17",
  clientDetailsFontSize: "14",
  billedService: "",
  baseAmount: "",
  vatRate: "21",
  irpfRate: "15",
};

const BANK_ACCOUNTS_STORAGE_KEY = "forseti.invoice-bank-accounts";

function readBrowserBankAccounts(): SavedBankAccount[] {
  try {
    const accounts = JSON.parse(window.localStorage.getItem(BANK_ACCOUNTS_STORAGE_KEY) || "[]") as SavedBankAccount[];
    return Array.isArray(accounts) ? accounts.filter((account) => account?.id && account?.value) : [];
  } catch {
    return [];
  }
}

function mergeBankAccounts(...groups: SavedBankAccount[][]) {
  const accounts = new Map<string, SavedBankAccount>();
  for (const account of groups.flat()) {
    const key = account.value.trim().toLocaleLowerCase("es");
    if (key && !accounts.has(key)) accounts.set(key, account);
  }
  return [...accounts.values()];
}

function writeBrowserBankAccounts(accounts: SavedBankAccount[]) {
  window.localStorage.setItem(BANK_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function parseDecimal(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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

  return `FACTURA Nº${invoiceCode} - ${clientName} - ${invoiceDate}`;
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

function buildInvoiceCode(form: InvoiceFormState) {
  const series = form.invoiceSeries.trim();
  const number = form.invoiceNumber.trim();

  if (series && number) return `${series}/${number}`;
  if (series) return series;
  if (number) return number;
  return "Sin numeracion";
}

function stepFormattedNumber(value: string, step: number) {
  const width = Math.max(value.trim().length, 1);
  const current = Number.parseInt(value.replace(/\D/g, ""), 10);
  const next = Math.max(1, (Number.isFinite(current) ? current : 1) + step);

  return String(next).padStart(width, "0");
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
    return [form.clientName || "CLIENTE", "Direccion pendiente", "CIF pendiente"];
  }

  return [form.clientName || "CLIENTE", ...form.clientDetails.split("\n").map((item) => item.trim()).filter(Boolean)];
}

function fontSize(value: string, minimum: number, maximum: number, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function invoiceToFormState(invoice: IssuedInvoice): InvoiceFormState {
  return {
    ...INITIAL_STATE,
    documentName: invoice.documentName,
    invoiceDate: invoice.issueDate.slice(0, 10),
    invoiceSeries: invoice.series || "A",
    invoiceNumber: String(invoice.number).padStart(6, "0"),
    articleCode: invoice.articleCode || "H",
    issuerName: invoice.issuer?.legalName || INITIAL_STATE.issuerName,
    issuerTaxId: invoice.issuer?.taxId || INITIAL_STATE.issuerTaxId,
    issuerAddress: invoice.issuer?.addressLine1 || INITIAL_STATE.issuerAddress,
    issuerPostalCode: invoice.issuer?.postalCode || INITIAL_STATE.issuerPostalCode,
    issuerCity: invoice.issuer?.city || INITIAL_STATE.issuerCity,
    issuerEmail: invoice.issuer?.email || INITIAL_STATE.issuerEmail,
    issuerPhone: invoice.issuer?.phone || INITIAL_STATE.issuerPhone,
    issuerBankAccount: invoice.issuer?.bankAccount || INITIAL_STATE.issuerBankAccount,
    clientName: invoice.clientName,
    clientDetails: invoice.clientDetails || "",
    billedService: invoice.serviceDescription || "Servicio",
    baseAmount: String(invoice.subtotalAmount ?? 0),
    vatRate: String(invoice.vatRate ?? 0),
    irpfRate: String(invoice.irpfRate ?? 0),
  };
}

function buildPrintableInvoiceDocument(
  form: InvoiceFormState,
  summary: InvoiceSummary,
) {
  const invoiceTitle = escapeHtml(buildInvoiceDocumentName(form));
  const invoiceCode = escapeHtml(buildInvoiceCode(form));
  const issuerCircleLines = buildIssuerCircleLines(form).map(escapeHtml).join("<br />");
  const clientDetailsLines = buildClientCircleLines(form).slice(1).map(escapeHtml).join("<br />");
  const clientNameFontSize = fontSize(form.clientNameFontSize, 11, 20, 17);
  const clientDetailsFontSize = fontSize(form.clientDetailsFontSize, 9, 18, 14);
  const billedService = multilineToHtml(form.billedService || "SERVICIO");
  const issuerBank = escapeHtml(form.issuerBankAccount || "");
  const issuerPhone = escapeHtml(form.issuerPhone || "");
  const issuerEmail = escapeHtml(form.issuerEmail || "");
  const invoiceDate = escapeHtml(formatDate(form.invoiceDate) || form.invoiceDate);
  const articleCode = escapeHtml((form.articleCode || "H").trim());

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
      .divider {
        border-bottom: 1px solid var(--line);
      }
      .right { text-align: right; }
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
    <main class="sheet">
      <section class="header">
        <div class="brand">
          <div class="brand-mark"></div>
          <div class="brand-name"><strong>MLC</strong><span>DESIGN</span></div>
        </div>
        <div class="doc-meta">
          <div class="date">FECHA: ${invoiceDate}</div>
          <div class="code">FACTURA Nº ${invoiceCode}</div>
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
              <th>ARTICULO</th>
              <th>DESCRIPCION</th>
              <th class="right">PRECIO</th>
              <th class="right">DTO.</th>
              <th class="right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${articleCode}</td>
              <td>${billedService}</td>
              <td class="right">${formatMoney(summary.baseAmount)}</td>
              <td class="right"></td>
              <td class="right">${formatMoney(summary.baseAmount)}</td>
            </tr>
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
  </body>
</html>`;
}

function openPrintablePreview(element: HTMLElement | null, title: string) {
  if (!element) return;

  const printWindow = window.open("", "forseti-print-document", "popup,width=1080,height=1440");
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    ${styles}
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        min-height: 100%;
        background: #f7f7f5;
      }
      body {
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
      .forseti-print-root {
        width: 760px;
        background: #f7f7f5;
      }
      @media print {
        html, body {
          width: 210mm;
          min-height: 297mm;
          background: #f7f7f5 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .forseti-print-root {
          width: 760px;
          margin: 0 auto;
          zoom: 0.98;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .forseti-print-root > * {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main class="forseti-print-root">${element.innerHTML}</main>
    <script>
      window.addEventListener("load", () => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 250);
      });
      window.addEventListener("afterprint", () => setTimeout(() => window.close(), 500), { once: true });
    </script>
  </body>
</html>`);
  printWindow.document.close();
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col items-center gap-2 text-center">
      <span className="text-center text-sm font-semibold text-slate-100">{label}</span>
      {children}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-sm text-white outline-none transition placeholder:text-center placeholder:text-slate-400 focus:border-[#87ba2f] focus:ring-2 focus:ring-[#87ba2f]/30";
}

function circleLinesForPreview(lines: string[]) {
  return lines.map((line) => <p key={line}>{line}</p>);
}

function normalizeSavedClients(clients: SavedInvoiceClient[], client: SavedInvoiceClient) {
  const nextClients = clients.filter((item) => item.id !== client.id);
  return [...nextClients, client].sort((a, b) => a.legalName.localeCompare(b.legalName, "es"));
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

function formatInvoiceBaseParam(value: string) {
  const parsed = parseDecimal(value);
  return parsed > 0 ? parsed.toFixed(2).replace(".", ",") : "";
}

function invoiceDateFromMonth(value: string) {
  const [monthName = "", yearValue = ""] = value.split(" ");
  const year = Number(yearValue);
  const monthIndex = [
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
  ].indexOf(normalizeLookup(monthName));

  if (!Number.isFinite(year) || monthIndex < 0) return new Date().toISOString().slice(0, 10);

  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function FacturacionClient() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState(INITIAL_STATE);
  const [generated, setGenerated] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [savedClients, setSavedClients] = useState<SavedInvoiceClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientStatus, setClientStatus] = useState("");
  const [savedBankAccounts, setSavedBankAccounts] = useState<SavedBankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [bankAccountStatus, setBankAccountStatus] = useState("");
  const [savedServices, setSavedServices] = useState<SavedService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceArticleCode, setNewServiceArticleCode] = useState("H");
  const [editingServiceId, setEditingServiceId] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");
  const [driveFolderQuery, setDriveFolderQuery] = useState("");
  const [driveFolders, setDriveFolders] = useState<DriveFolderOption[]>([]);
  const [selectedDriveFolderId, setSelectedDriveFolderId] = useState("");
  const [driveStatus, setDriveStatus] = useState("");
  const [isDriveBusy, setIsDriveBusy] = useState(false);
  const [issuedInvoices, setIssuedInvoices] = useState<IssuedInvoice[]>([]);
  const [editingInvoiceId, setEditingInvoiceId] = useState("");
  const [invoiceHistoryStatus, setInvoiceHistoryStatus] = useState("");
  const [hoveredInvoiceId, setHoveredInvoiceId] = useState("");
  const [historicalPrint, setHistoricalPrint] = useState<{ form: InvoiceFormState; summary: InvoiceSummary; title: string } | null>(null);
  const baseId = useId();
  const printPreviewRef = useRef<HTMLDivElement>(null);
  const historicalPrintRef = useRef<HTMLDivElement>(null);
  const lastIrpfRateRef = useRef(INITIAL_STATE.irpfRate);
  const fieldClassName = inputClassName();

  const summary = useMemo(() => {
    const baseAmount = parseDecimal(form.baseAmount);
    const vatRate = parseDecimal(form.vatRate);
    const irpfRate = parseDecimal(form.irpfRate);
    const vatAmount = baseAmount * (vatRate / 100);
    const irpfAmount = baseAmount * (irpfRate / 100);
    const totalAmount = baseAmount + vatAmount - irpfAmount;

    return {
      baseAmount,
      vatRate,
      irpfRate,
      vatAmount,
      irpfAmount,
      totalAmount,
    };
  }, [form.baseAmount, form.irpfRate, form.vatRate]);

  const previewDocumentName = buildInvoiceDocumentName(form);
  const previewInvoiceCode = buildInvoiceCode(form);
  const editingInvoice = useMemo(
    () => issuedInvoices.find((invoice) => invoice.id === editingInvoiceId),
    [editingInvoiceId, issuedInvoices],
  );
  const hoveredInvoice = useMemo(
    () => issuedInvoices.find((invoice) => invoice.id === hoveredInvoiceId),
    [hoveredInvoiceId, issuedInvoices],
  );
  const printDisabled =
    !generated ||
    !form.clientName.trim() ||
    !form.billedService.trim() ||
    summary.baseAmount <= 0;

  const refreshIssuedInvoices = useCallback(async () => {
    try {
      const response = await fetch("/api/facturacion/facturas", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as { invoices?: IssuedInvoice[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las facturas emitidas.");
      setIssuedInvoices(data.invoices ?? []);
      setInvoiceHistoryStatus("");
    } catch (error) {
      setInvoiceHistoryStatus(error instanceof Error ? error.message : "No se pudieron cargar las facturas emitidas.");
    }
  }, []);

  async function loadNextInvoiceNumber(series = form.invoiceSeries, force = false) {
    if (editingInvoiceId && !force) return form.invoiceNumber;

    const response = await fetch(`/api/facturacion/siguiente-numero?serie=${encodeURIComponent(series || "A")}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("No se pudo leer el siguiente número de factura.");

    const data = (await response.json()) as { formattedNumber?: string; series?: string };
    if (!data.formattedNumber) throw new Error("No se pudo leer el siguiente número de factura.");
    const formattedNumber = data.formattedNumber;

    setForm((current) => ({
      ...current,
      invoiceSeries: data.series || current.invoiceSeries,
      invoiceNumber: formattedNumber,
    }));

    return formattedNumber;
  }

  async function registerCurrentInvoice() {
    const isEditing = Boolean(editingInvoiceId);
    const response = await fetch("/api/facturacion/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: isEditing ? editingInvoiceId : undefined,
        documentName: previewDocumentName,
        series: form.invoiceSeries,
        number: form.invoiceNumber,
        issueDate: form.invoiceDate,
        clientName: form.clientName,
        clientDetails: form.clientDetails,
        articleCode: form.articleCode,
        serviceDescription: form.billedService,
        subtotalAmount: summary.baseAmount,
        vatRate: summary.vatRate,
        vatAmount: summary.vatAmount,
        irpfRate: summary.irpfRate,
        irpfAmount: summary.irpfAmount,
        totalAmount: summary.totalAmount,
      }),
    });
    const responseText = await response.text();
    let data: { error?: string } = {};
    try {
      data = responseText ? (JSON.parse(responseText) as { error?: string }) : {};
    } catch {
      // Conservamos el texto devuelto por el servidor para no ocultar errores de despliegue.
    }
    if (!response.ok) {
      const serverMessage = responseText && !responseText.trimStart().startsWith("<") ? responseText.slice(0, 300) : "";
      throw new Error(data.error || serverMessage || `No se pudo guardar la factura (HTTP ${response.status}).`);
    }
    await refreshIssuedInvoices();
  }

  function handlePrintIssuedInvoice(invoice: IssuedInvoice) {
    const historicalForm = invoiceToFormState(invoice);
    const historicalSummary: InvoiceSummary = {
      baseAmount: invoice.subtotalAmount ?? 0,
      vatRate: invoice.vatRate ?? 0,
      vatAmount: invoice.vatAmount ?? 0,
      irpfRate: invoice.irpfRate ?? 0,
      irpfAmount: invoice.irpfAmount ?? 0,
      totalAmount: invoice.totalAmount ?? 0,
    };
    setHistoricalPrint({ form: historicalForm, summary: historicalSummary, title: invoice.documentName });
  }

  function handleEditIssuedInvoice(invoice: IssuedInvoice) {
    const nextForm = invoiceToFormState(invoice);
    setForm(nextForm);
    setEditingInvoiceId(invoice.id);
    setSelectedClientId("");
    setGenerated(true);
    setIsPreviewOpen(false);
    setDriveStatus(`Editando factura ${nextForm.invoiceSeries}/${nextForm.invoiceNumber}.`);
  }

  async function handleCancelInvoiceEdit() {
    const series = form.invoiceSeries || INITIAL_STATE.invoiceSeries;
    setEditingInvoiceId("");
    setGenerated(false);
    setForm((current) => ({
      ...INITIAL_STATE,
      invoiceSeries: current.invoiceSeries || INITIAL_STATE.invoiceSeries,
    }));
    setDriveStatus("Edicion cancelada. Preparando una factura nueva...");

    try {
      const nextNumber = await loadNextInvoiceNumber(series, true);
      setDriveStatus(`Edicion cancelada. Siguiente numero preparado: ${series}/${nextNumber}.`);
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "Edicion cancelada, pero no se pudo preparar el siguiente numero.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        const response = await fetch("/api/facturacion/clientes", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as { clients?: SavedInvoiceClient[]; error?: string };
        if (!response.ok || data.error) throw new Error(data.error || "No se pudieron cargar las fichas.");
        if (!cancelled) setSavedClients(data.clients ?? []);
      } catch (error) {
        if (!cancelled) setClientStatus(error instanceof Error ? error.message : "No se pudieron cargar las fichas guardadas.");
      }
    }

    loadClients();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBankAccounts() {
      try {
        const response = await fetch("/api/facturacion/cuentas-bancarias", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as { accounts?: SavedBankAccount[]; error?: string };
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las cuentas bancarias.");
        if (cancelled) return;

        const accounts = mergeBankAccounts(data.accounts ?? [], readBrowserBankAccounts());
        writeBrowserBankAccounts(accounts);
        setSavedBankAccounts(accounts);
        const selected = accounts.find((account) => account.value === INITIAL_STATE.issuerBankAccount);
        setSelectedBankAccountId(selected?.id ?? "");
      } catch (error) {
        if (!cancelled) {
          const accounts = readBrowserBankAccounts();
          setSavedBankAccounts(accounts);
          const selected = accounts.find((account) => account.value === INITIAL_STATE.issuerBankAccount);
          setSelectedBankAccountId(selected?.id ?? "");
          setBankAccountStatus(accounts.length ? "Cuentas cargadas desde este navegador." : error instanceof Error ? error.message : "No se pudieron cargar las cuentas bancarias.");
        }
      }
    }

    void loadBankAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        const response = await fetch("/api/facturacion/servicios", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as { services?: SavedService[]; error?: string };
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los servicios.");
        if (!cancelled) setSavedServices(data.services ?? []);
      } catch (error) {
        if (!cancelled) setServiceStatus(error instanceof Error ? error.message : "No se pudieron cargar los servicios.");
      }
    }

    void loadServices();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshIssuedInvoices();
  }, [refreshIssuedInvoices]);

  useEffect(() => {
    if (!historicalPrint) return;
    openPrintablePreview(historicalPrintRef.current, historicalPrint.title);
  }, [historicalPrint]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialInvoiceNumber() {
      try {
        const response = await fetch(`/api/facturacion/siguiente-numero?serie=${encodeURIComponent(INITIAL_STATE.invoiceSeries)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { formattedNumber?: string; series?: string };
        if (cancelled || !data.formattedNumber) return;
        const formattedNumber = data.formattedNumber;
        setForm((current) => ({
          ...current,
          invoiceSeries: data.series || current.invoiceSeries,
          invoiceNumber: formattedNumber,
        }));
      } catch {
        // La factura sigue siendo editable si no se puede leer la numeración.
      }
    }

    loadInitialInvoiceNumber();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const base = searchParams.get("base");
    const client = searchParams.get("cliente");
    const clientId = searchParams.get("clienteId");
    const origin = searchParams.get("origen");
    const service = searchParams.get("servicio");
    const month = searchParams.get("mes");

    if (!base && !client && !clientId && !service && !month && !origin) return;

    const clientName = client ? displayClientName(client) : "";
    const normalizedClient = normalizeLookup(clientName);
    const savedClient =
      savedClients.find((item) => item.id === clientId) ??
      savedClients.find((item) => normalizeLookup(item.legalName) === normalizedClient);
    const auditOrigin = origin === "auditoria";

    setForm((current) => ({
      ...current,
      documentName: month ? `Factura ${clientName || "cliente"} - ${month}` : current.documentName,
      invoiceDate: auditOrigin && month ? invoiceDateFromMonth(month) : current.invoiceDate,
      clientName: savedClient?.legalName ?? (clientName || current.clientName),
      clientDetails: savedClient?.details ?? current.clientDetails,
      billedService: service || current.billedService,
      baseAmount: base ? formatInvoiceBaseParam(base) : current.baseAmount,
    }));
    setSelectedClientId(savedClient?.id ?? "");
    setGenerated(false);

    if (auditOrigin) {
      let cancelled = false;

      async function loadNextInvoiceNumber() {
        try {
          const response = await fetch(`/api/facturacion/siguiente-numero?serie=${encodeURIComponent(INITIAL_STATE.invoiceSeries)}`, {
            cache: "no-store",
          });
          if (!response.ok) return;
          const data = (await response.json()) as { formattedNumber?: string; series?: string };
          if (cancelled || !data.formattedNumber) return;
          const formattedNumber = data.formattedNumber;
          setForm((current) => ({
            ...current,
            invoiceSeries: data.series || current.invoiceSeries,
            invoiceNumber: formattedNumber,
          }));
        } catch {
          // La factura sigue siendo editable si no se puede leer la numeracion.
        }
      }

      loadNextInvoiceNumber();
      return () => {
        cancelled = true;
      };
    }
  }, [savedClients, searchParams]);

  function updateField<Key extends keyof InvoiceFormState>(key: Key, value: InvoiceFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleIrpfChoice(applyIrpf: boolean) {
    if (applyIrpf) {
      updateField("irpfRate", lastIrpfRateRef.current || INITIAL_STATE.irpfRate);
      return;
    }

    if (parseDecimal(form.irpfRate) > 0) lastIrpfRateRef.current = form.irpfRate;
    updateField("irpfRate", "0");
  }

  function handleSelectSavedClient(clientId: string) {
    setSelectedClientId(clientId);
    setClientStatus("");

    const client = savedClients.find((item) => item.id === clientId);
    if (!client) return;

    setForm((current) => ({
      ...current,
      clientName: client.legalName,
      clientDetails: client.details,
      clientNameFontSize: String(client.nameFontSize ?? 17),
      clientDetailsFontSize: String(client.detailsFontSize ?? 14),
    }));
  }

  async function handleSaveClientProfile() {
    const legalName = form.clientName.trim();
    if (!legalName) {
      setClientStatus("Escribe el nombre del cliente antes de guardar la ficha.");
      return;
    }

    setClientStatus("Guardando ficha...");

    try {
      const response = await fetch("/api/facturacion/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedClientId || undefined,
          legalName,
          details: form.clientDetails,
          nameFontSize: fontSize(form.clientNameFontSize, 11, 20, 17),
          detailsFontSize: fontSize(form.clientDetailsFontSize, 9, 18, 14),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { client?: SavedInvoiceClient; error?: string };
      if (!response.ok || !data.client) throw new Error(data.error || "No se pudo guardar la ficha.");

      setSavedClients((current) => normalizeSavedClients(current, data.client!));
      setSelectedClientId(data.client.id);
      setClientStatus("Ficha guardada.");
    } catch (error) {
      setClientStatus(error instanceof Error ? error.message : "No se pudo guardar la ficha.");
    }
  }

  function handleSelectBankAccount(accountId: string) {
    setSelectedBankAccountId(accountId);
    setBankAccountStatus("");
    const account = savedBankAccounts.find((item) => item.id === accountId);
    if (account) updateField("issuerBankAccount", account.value);
  }

  async function handleSaveBankAccount() {
    const value = form.issuerBankAccount.trim();
    if (!value) {
      setBankAccountStatus("Escribe una cuenta bancaria antes de guardarla.");
      return;
    }

    setBankAccountStatus("Guardando cuenta...");
    const browserAccount: SavedBankAccount = {
      id: globalThis.crypto?.randomUUID?.() ?? `bank-${Date.now()}`,
      value,
    };

    try {
      const response = await fetch("/api/facturacion/cuentas-bancarias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = (await response.json().catch(() => ({}))) as { account?: SavedBankAccount; error?: string };
      if (!response.ok || !data.account) {
        const accounts = mergeBankAccounts(savedBankAccounts, [browserAccount]);
        writeBrowserBankAccounts(accounts);
        setSavedBankAccounts(accounts);
        setSelectedBankAccountId(accounts.find((account) => account.value.toLocaleLowerCase("es") === value.toLocaleLowerCase("es"))?.id ?? browserAccount.id);
        setBankAccountStatus("Cuenta bancaria guardada en este navegador.");
        return;
      }

      const accounts = mergeBankAccounts(savedBankAccounts, [data.account]);
      writeBrowserBankAccounts(accounts);
      setSavedBankAccounts(accounts);
      setSelectedBankAccountId(accounts.find((account) => account.value.toLocaleLowerCase("es") === value.toLocaleLowerCase("es"))?.id ?? data.account.id);
      setBankAccountStatus("Cuenta bancaria guardada.");
    } catch (error) {
      const accounts = mergeBankAccounts(savedBankAccounts, [browserAccount]);
      writeBrowserBankAccounts(accounts);
      setSavedBankAccounts(accounts);
      setSelectedBankAccountId(accounts.find((account) => account.value.toLocaleLowerCase("es") === value.toLocaleLowerCase("es"))?.id ?? browserAccount.id);
      setBankAccountStatus(error instanceof Error ? "Cuenta guardada en este navegador; el servidor no permite persistirla." : "Cuenta bancaria guardada en este navegador.");
    }
  }

  function handleToggleService(service: SavedService) {
    const selected = selectedServiceIds.includes(service.id);
    setSelectedServiceIds((current) => (selected ? current.filter((id) => id !== service.id) : [...current, service.id]));
    setServiceStatus("");
    setForm((current) => {
      const lines = current.billedService.split("\n").map((line) => line.trim()).filter(Boolean);
      const nextLines = selected
        ? lines.filter((line) => line.toLocaleLowerCase("es") !== service.name.toLocaleLowerCase("es"))
        : lines.some((line) => line.toLocaleLowerCase("es") === service.name.toLocaleLowerCase("es"))
          ? lines
          : [...lines, service.name];
      return { ...current, billedService: nextLines.join("\n"), articleCode: selected ? current.articleCode : service.articleCode || current.articleCode };
    });
  }

  function handleEditService(service: SavedService) {
    setEditingServiceId(service.id);
    setNewServiceName(service.name);
    setNewServiceArticleCode(service.articleCode || "H");
    setServiceStatus("Editando servicio guardado.");
  }

  async function handleDeleteService(service: SavedService) {
    if (!window.confirm(`¿Eliminar el servicio "${service.name}"?`)) return;

    setServiceStatus("Eliminando servicio...");
    try {
      const response = await fetch(`/api/facturacion/servicios?id=${encodeURIComponent(service.id)}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar el servicio.");

      setSavedServices((current) => current.filter((item) => item.id !== service.id));
      setSelectedServiceIds((current) => current.filter((id) => id !== service.id));
      setForm((current) => ({
        ...current,
        billedService: current.billedService
          .split("\n")
          .filter((line) => line.trim().toLocaleLowerCase("es") !== service.name.toLocaleLowerCase("es"))
          .join("\n"),
      }));
      if (editingServiceId === service.id) {
        setEditingServiceId("");
        setNewServiceName("");
        setNewServiceArticleCode("H");
      }
      setServiceStatus("Servicio eliminado.");
    } catch (error) {
      setServiceStatus(error instanceof Error ? error.message : "No se pudo eliminar el servicio.");
    }
  }

  async function handleDeleteIssuedInvoice(invoice: IssuedInvoice) {
    const invoiceLabel = `${invoice.series}/${String(invoice.number).padStart(6, "0")}`;
    if (!window.confirm(`¿Eliminar definitivamente la factura ${invoiceLabel} de ${invoice.clientName}?`)) return;

    setInvoiceHistoryStatus(`Eliminando factura ${invoiceLabel}...`);
    try {
      const response = await fetch(`/api/facturacion/facturas?id=${encodeURIComponent(invoice.id)}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar la factura.");

      setIssuedInvoices((current) => current.filter((item) => item.id !== invoice.id));
      if (editingInvoiceId === invoice.id) void handleCancelInvoiceEdit();
      setInvoiceHistoryStatus(`Factura ${invoiceLabel} eliminada.`);
    } catch (error) {
      setInvoiceHistoryStatus(error instanceof Error ? error.message : "No se pudo eliminar la factura.");
    }
  }

  async function handleSaveService() {
    const name = newServiceName.trim();
    if (!name) {
      setServiceStatus("Escribe el nombre del servicio antes de guardarlo.");
      return;
    }

    setServiceStatus("Guardando servicio...");
    try {
      const previousService = savedServices.find((service) => service.id === editingServiceId);
      const response = await fetch("/api/facturacion/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingServiceId || undefined, name, articleCode: newServiceArticleCode }),
      });
      const data = (await response.json().catch(() => ({}))) as { service?: SavedService; error?: string };
      if (!response.ok || !data.service) throw new Error(data.error || "No se pudo guardar el servicio.");

      const service = data.service;
      setSavedServices((current) => [...current.filter((item) => item.id !== service.id), service].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setNewServiceName("");
      setNewServiceArticleCode("H");
      setEditingServiceId("");
      setServiceStatus(editingServiceId ? "Servicio actualizado." : "Servicio guardado y seleccionado.");
      if (previousService && selectedServiceIds.includes(previousService.id)) {
        setSelectedServiceIds((current) => current.map((id) => (id === previousService.id ? service.id : id)));
        setForm((current) => ({
          ...current,
          articleCode: service.articleCode || current.articleCode,
          billedService: current.billedService
            .split("\n")
            .map((line) => (line.trim().toLocaleLowerCase("es") === previousService.name.toLocaleLowerCase("es") ? service.name : line))
            .join("\n"),
        }));
      } else if (!selectedServiceIds.includes(service.id)) {
        handleToggleService(service);
      }
    } catch (error) {
      setServiceStatus(error instanceof Error ? error.message : "No se pudo guardar el servicio.");
    }
  }

  function handleGenerateInvoice() {
    setGenerated(true);
  }

  async function handlePrintInvoice() {
    const isEditing = Boolean(editingInvoiceId);
    setDriveStatus(isEditing ? "Actualizando factura emitida..." : "Guardando número de factura...");

    try {
      await registerCurrentInvoice();
      openPrintablePreview(printPreviewRef.current, previewDocumentName);
      setGenerated(false);
      if (isEditing) {
        setEditingInvoiceId("");
        setDriveStatus(`Factura ${previewInvoiceCode} actualizada.`);
      } else {
        const nextNumber = await loadNextInvoiceNumber(form.invoiceSeries);
        setDriveStatus(`Factura ${previewInvoiceCode} registrada. Siguiente número preparado: ${form.invoiceSeries}/${nextNumber}.`);
      }
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "No se pudo guardar la numeración de la factura.");
    }
  }

  async function handleSearchDriveFolders() {
    setIsDriveBusy(true);
    setDriveStatus("Buscando carpetas...");

    try {
      const response = await fetch(`/api/drive/folders?q=${encodeURIComponent(driveFolderQuery)}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as { folders?: DriveFolderOption[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudieron leer las carpetas de Drive.");
      setDriveFolders(data.folders ?? []);
      setDriveStatus((data.folders ?? []).length ? "Selecciona una carpeta de destino." : "No se encontraron carpetas.");
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "No se pudieron leer las carpetas de Drive.");
    } finally {
      setIsDriveBusy(false);
    }
  }

  async function handleSaveInvoiceToDrive() {
    if (!selectedDriveFolderId) {
      setDriveStatus("Selecciona una carpeta de Drive antes de guardar.");
      return;
    }

    setIsDriveBusy(true);
    setDriveStatus("Guardando documento en Drive...");

    try {
      const html = buildPrintableInvoiceDocument(form, summary);
      const response = await fetch("/api/drive/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: selectedDriveFolderId,
          fileName: previewDocumentName,
          html,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        file?: { name?: string; webViewLink?: string };
        error?: string;
      };
      if (!response.ok || !data.file) throw new Error(data.error || "No se pudo guardar el documento en Drive.");
      const isEditing = Boolean(editingInvoiceId);
      await registerCurrentInvoice();
      setGenerated(false);
      const driveMessage = data.file.webViewLink ? `Guardado en Drive: ${data.file.name} - ${data.file.webViewLink}` : `Guardado en Drive: ${data.file.name}`;
      if (isEditing) {
        setEditingInvoiceId("");
        setDriveStatus(`${driveMessage}. Factura ${previewInvoiceCode} actualizada.`);
      } else {
        const nextNumber = await loadNextInvoiceNumber(form.invoiceSeries);
        setDriveStatus(`${driveMessage}. Factura ${previewInvoiceCode} registrada. Siguiente número preparado: ${form.invoiceSeries}/${nextNumber}.`);
      }
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "No se pudo guardar el documento en Drive.");
    } finally {
      setIsDriveBusy(false);
    }
  }

  const currentForm = form;
  const currentSummary = summary;
  const renderInvoicePreview = (className = "", form = currentForm, summary = currentSummary) => {
    const invoiceCode = buildInvoiceCode(form);
    const localIssuerCircleLines = buildIssuerCircleLines(form);
    const localClientCircleLines = buildClientCircleLines(form);

    return (
    <article className={`overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)] ${className}`}> 
          <div className="px-8 pt-8 pb-0">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white px-1 py-1">
                  <Image src="/logo-mlc-design.png" alt="MLC Design" width={240} height={90} className="h-auto w-52" />
                </div>
              </div>
              <div className="pt-2 text-right">
                <p className="text-[18px] font-medium text-sky-400">FECHA: {formatDate(form.invoiceDate) || "Sin fecha"}</p>
                <div className="mt-6 text-right font-light tracking-[0.02em] text-slate-200">
                  <p className="text-[28px] leading-tight">FACTURA Nº</p>
                  <p className="mt-1 text-[26px] leading-tight">{invoiceCode}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 h-[2px] bg-[linear-gradient(90deg,#1f1f1f_0_38%,#78c8ee_38%_100%)]" />

            <div className="mt-10 flex items-start justify-between gap-6">
              <div className="flex h-[210px] w-[210px] items-center justify-center rounded-full bg-sky-300 px-6 text-center text-white">
                <div className="space-y-0.5 text-[14px] leading-[1.12]">
                  <p className="text-[17px] font-bold">{form.issuerName || "EMISOR"}</p>
                  {circleLinesForPreview(localIssuerCircleLines.slice(1))}
                </div>
              </div>
              <div className="flex h-[210px] w-[210px] items-center justify-center rounded-full bg-[#1f1f1f] px-6 text-center text-white">
                <div className="space-y-0.5 text-[14px] leading-[1.12]">
                  <p className="font-bold" style={{ fontSize: `${fontSize(form.clientNameFontSize, 11, 20, 17)}px` }}>{form.clientName || "CLIENTE"}</p>
                  <div style={{ fontSize: `${fontSize(form.clientDetailsFontSize, 9, 18, 14)}px` }}>
                    {circleLinesForPreview(localClientCircleLines.slice(1))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[16px] font-normal text-slate-800">
                    <th className="pb-3 text-left font-normal">ARTICULO</th>
                    <th className="pb-3 text-left font-normal">DESCRIPCION</th>
                    <th className="pb-3 text-right font-normal">PRECIO</th>
                    <th className="pb-3 text-right font-normal">DTO.</th>
                    <th className="pb-3 text-right font-normal">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-[16px] text-slate-800">
                    <td className="pt-5">{form.articleCode || "H"}</td>
                    <td className="pt-5 whitespace-pre-line">{form.billedService || "SERVICIO"}</td>
                    <td className="pt-5 text-right">{formatMoney(summary.baseAmount)}</td>
                    <td className="pt-5 text-right"></td>
                    <td className="pt-5 text-right">{formatMoney(summary.baseAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-44">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[16px] font-normal text-slate-800">
                    <th className="pb-3 text-left font-normal">TOTAL</th>
                    <th className="pb-3 text-right font-normal">%IVA</th>
                    <th className="pb-3 text-right font-normal">CUOTA IVA</th>
                    {summary.irpfRate > 0 ? (
                      <>
                        <th className="pb-3 text-right font-normal">% IRPF</th>
                        <th className="pb-3 text-right font-normal">CUOTA IRPF</th>
                      </>
                    ) : null}
                    <th className="pb-3 text-right font-normal">TOTAL FACTURA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-[16px] text-slate-800">
                    <td className="pt-4">{formatMoney(summary.baseAmount)}</td>
                    <td className="pt-4 text-right">{formatPercent(summary.vatRate)}</td>
                    <td className="pt-4 text-right">{formatMoney(summary.vatAmount)}</td>
                    {summary.irpfRate > 0 ? (
                      <>
                        <td className="pt-4 text-right">{formatPercent(summary.irpfRate, true)}</td>
                        <td className="pt-4 text-right">-{formatMoney(summary.irpfAmount)}</td>
                      </>
                    ) : null}
                    <td className="pt-4 text-right">{formatMoney(summary.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-14 text-[16px] text-slate-800">{form.issuerBankAccount || "Cuenta bancaria pendiente"}</div>
          </div>

          <div className="mt-14 flex items-end justify-between bg-[#1f1f1f] px-8 py-8 text-white">
            <div>
              <p className="text-[34px] font-bold leading-none">{form.issuerPhone || "Telefono"}</p>
              <p className="mt-3 text-[16px] leading-[1.35]">{form.issuerEmail || "email@dominio.com"}</p>
              <p className="text-[16px] leading-[1.35]">www.mlcdesign.es</p>
            </div>
            <div className="text-[46px] font-semibold tracking-[0.04em]">
              MLC<span className="font-light text-sky-300">DESIGN</span>
            </div>
          </div>
        </article>
    );
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.55fr)] xl:items-start">
      <div className="order-1 rounded-[28px] border border-white/10 bg-[#0f1728] p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] xl:order-1 xl:sticky xl:top-6">
        <div className="mb-6 flex items-start justify-center gap-4 text-center">
          <div className="flex w-full flex-col items-center text-center">
            <p className="w-full text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#a3cf56]">
              Plantilla tipo MLC
            </p>
            <h2 className="mx-auto mt-2 w-full max-w-sm text-center text-2xl font-semibold text-white">
              Factura basada en el ejemplo subido
            </h2>
            <p className="mx-auto mt-3 w-full max-w-sm text-center text-sm leading-6 text-slate-300">
              Esta versión replica la estructura del PDF de ejemplo: cabecera limpia, número grande, círculos de emisor y cliente, tabla simple, resumen fiscal y pie negro.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <FormField label="Nombre generado del documento" htmlFor={`${baseId}-document`}>
            <input id={`${baseId}-document`} className={`${fieldClassName} cursor-default`} value={previewDocumentName} readOnly />
          </FormField>
        </div>

        {editingInvoice ? (
          <div className="mx-auto mt-4 w-full max-w-lg rounded-2xl border border-[#87ba2f]/35 bg-[#87ba2f]/12 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7f0a7]">Editando factura emitida</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {editingInvoice.series}/{String(editingInvoice.number).padStart(6, "0")} · {editingInvoice.clientName}
            </p>
          </div>
        ) : null}

        <div className="mx-auto mt-4 grid w-full max-w-lg justify-items-center gap-4 sm:grid-cols-3">
          <div>
            <FormField label="Fecha de factura" htmlFor={`${baseId}-date`}>
              <input id={`${baseId}-date`} type="date" className={fieldClassName} value={form.invoiceDate} onChange={(event) => updateField("invoiceDate", event.target.value)} />
            </FormField>
          </div>
          <div>
            <FormField label="Serie" htmlFor={`${baseId}-series`}>
              <input id={`${baseId}-series`} className={fieldClassName} value={form.invoiceSeries} onChange={(event) => updateField("invoiceSeries", event.target.value)} />
            </FormField>
          </div>
          <div>
            <FormField label="Numero" htmlFor={`${baseId}-number`}>
              <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-white/12 bg-white/6 text-lg font-semibold text-white transition hover:bg-white/10"
                  title="Retroceder numero"
                  onClick={() => updateField("invoiceNumber", stepFormattedNumber(form.invoiceNumber, -1))}
                >
                  -
                </button>
                <input id={`${baseId}-number`} className={fieldClassName} value={form.invoiceNumber} onChange={(event) => updateField("invoiceNumber", event.target.value)} />
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-white/12 bg-white/6 text-lg font-semibold text-white transition hover:bg-white/10"
                  title="Avanzar numero"
                  onClick={() => updateField("invoiceNumber", stepFormattedNumber(form.invoiceNumber, 1))}
                >
                  +
                </button>
              </div>
            </FormField>
          </div>
        </div>

        <details open className="group mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/55">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left marker:content-none">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Emisor</span>
            <span className="text-lg text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <FormField label="Nombre del emisor" htmlFor={`${baseId}-issuer-name`}>
                <input id={`${baseId}-issuer-name`} className={fieldClassName} value={form.issuerName} onChange={(event) => updateField("issuerName", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-4">
              <FormField label="NIF / CIF" htmlFor={`${baseId}-issuer-tax`}>
                <input id={`${baseId}-issuer-tax`} className={fieldClassName} value={form.issuerTaxId} onChange={(event) => updateField("issuerTaxId", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-12">
              <FormField label="Direccion" htmlFor={`${baseId}-issuer-address`}>
                <input id={`${baseId}-issuer-address`} className={fieldClassName} value={form.issuerAddress} onChange={(event) => updateField("issuerAddress", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-4">
              <FormField label="Codigo postal" htmlFor={`${baseId}-issuer-postal`}>
                <input id={`${baseId}-issuer-postal`} className={fieldClassName} value={form.issuerPostalCode} onChange={(event) => updateField("issuerPostalCode", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-8">
              <FormField label="Ciudad" htmlFor={`${baseId}-issuer-city`}>
                <input id={`${baseId}-issuer-city`} className={fieldClassName} value={form.issuerCity} onChange={(event) => updateField("issuerCity", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-5">
              <FormField label="Telefono" htmlFor={`${baseId}-issuer-phone`}>
                <input id={`${baseId}-issuer-phone`} className={fieldClassName} value={form.issuerPhone} onChange={(event) => updateField("issuerPhone", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-7">
              <FormField label="Email" htmlFor={`${baseId}-issuer-email`}>
                <input id={`${baseId}-issuer-email`} className={fieldClassName} value={form.issuerEmail} onChange={(event) => updateField("issuerEmail", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-12">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <FormField label="Elegir cuenta bancaria" htmlFor={`${baseId}-saved-bank`}>
                  <select
                    id={`${baseId}-saved-bank`}
                    className={fieldClassName}
                    value={selectedBankAccountId}
                    onChange={(event) => handleSelectBankAccount(event.target.value)}
                  >
                    <option value="">Nueva cuenta bancaria</option>
                    {savedBankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.value}
                      </option>
                    ))}
                  </select>
                </FormField>
                <button type="button" onClick={handleSaveBankAccount} className="min-h-11 rounded-2xl bg-[#87ba2f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44]">
                  Guardar cuenta
                </button>
              </div>
              <div className="mt-3">
                <FormField label="Nombre del banco e IBAN" htmlFor={`${baseId}-issuer-bank`}>
                  <input
                    id={`${baseId}-issuer-bank`}
                    className={fieldClassName}
                    value={form.issuerBankAccount}
                    onChange={(event) => {
                      updateField("issuerBankAccount", event.target.value);
                      setSelectedBankAccountId("");
                      setBankAccountStatus("");
                    }}
                    placeholder="BANCO: ES00 0000 0000 0000 0000 0000"
                  />
                </FormField>
              </div>
              {bankAccountStatus ? <p className="mt-3 text-center text-xs font-semibold text-[#d7f0a7]">{bankAccountStatus}</p> : null}
            </div>
          </div>
        </details>

        <details className="group mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/55">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left marker:content-none">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Cliente y precio</span>
            <span className="text-lg text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="px-4 pb-4">
          <div className="mx-auto grid w-full max-w-xl gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <FormField label="Seleccionar ficha guardada" htmlFor={`${baseId}-saved-client`}>
              <select
                id={`${baseId}-saved-client`}
                className={fieldClassName}
                value={selectedClientId}
                onChange={(event) => handleSelectSavedClient(event.target.value)}
              >
                <option value="">Nueva ficha de cliente</option>
                {savedClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.legalName}
                  </option>
                ))}
              </select>
            </FormField>
            <button type="button" onClick={handleSaveClientProfile} className="min-h-11 rounded-2xl bg-[#87ba2f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44]">
              Guardar ficha
            </button>
          </div>
          {clientStatus ? <p className="mt-3 text-center text-xs font-semibold text-[#d7f0a7]">{clientStatus}</p> : null}

          <div className="mt-4">
            <FormField label="Nombre del cliente" htmlFor={`${baseId}-client`}>
              <input id={`${baseId}-client`} className={fieldClassName} value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Datos del cliente" htmlFor={`${baseId}-details`}>
              <textarea id={`${baseId}-details`} className={`${fieldClassName} min-h-28 resize-y`} value={form.clientDetails} onChange={(event) => updateField("clientDetails", event.target.value)} placeholder={"PLAZA ...\n02001 - ALBACETE\nCIF: ...\nTlf: ..."} />
            </FormField>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label={`Tamaño del nombre (${fontSize(form.clientNameFontSize, 11, 20, 17)} px)`} htmlFor={`${baseId}-client-name-size`}>
              <input id={`${baseId}-client-name-size`} type="range" min="11" max="20" step="1" className="w-full accent-[#87ba2f]" value={form.clientNameFontSize} onChange={(event) => updateField("clientNameFontSize", event.target.value)} />
            </FormField>
            <FormField label={`Tamaño de la dirección (${fontSize(form.clientDetailsFontSize, 9, 18, 14)} px)`} htmlFor={`${baseId}-client-details-size`}>
              <input id={`${baseId}-client-details-size`} type="range" min="9" max="18" step="1" className="w-full accent-[#87ba2f]" value={form.clientDetailsFontSize} onChange={(event) => updateField("clientDetailsFontSize", event.target.value)} />
            </FormField>
          </div>
          <div className="mt-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b3d87d]">Tipos de servicio</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Crea servicios con su artículo o edita los que ya tienes guardados.</p>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <FormField label="Crear un servicio" htmlFor={`${baseId}-new-service`}>
                  <input
                    id={`${baseId}-new-service`}
                    className={fieldClassName}
                    value={newServiceName}
                    onChange={(event) => {
                      setNewServiceName(event.target.value);
                      setServiceStatus("");
                    }}
                    placeholder="Ej. Gestión de redes sociales"
                  />
                </FormField>
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(10rem,auto)] sm:items-end sm:justify-start">
                  <FormField label="Artículo" htmlFor={`${baseId}-new-service-article`}>
                    <input id={`${baseId}-new-service-article`} className={fieldClassName} value={newServiceArticleCode} onChange={(event) => setNewServiceArticleCode(event.target.value.toUpperCase())} placeholder="H" />
                  </FormField>
                  <button type="button" onClick={handleSaveService} className="min-h-11 rounded-2xl bg-[#87ba2f] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44]">
                    {editingServiceId ? "Actualizar servicio" : "Guardar servicio"}
                  </button>
                </div>
                {editingServiceId ? (
                  <button type="button" onClick={() => { setEditingServiceId(""); setNewServiceName(""); setNewServiceArticleCode("H"); setServiceStatus(""); }} className="mt-3 text-xs font-semibold text-slate-300 underline decoration-white/30 underline-offset-4">
                    Cancelar edición
                  </button>
                ) : null}
              </div>

              {savedServices.length > 0 ? (
                <div className="mt-5 grid gap-2">
                  {savedServices.map((service) => {
                    const selected = selectedServiceIds.includes(service.id);
                    return (
                      <div key={service.id} className={`flex min-w-0 items-stretch overflow-hidden rounded-xl border transition ${selected ? "border-[#87ba2f]" : "border-white/15"}`}>
                        <button type="button" aria-pressed={selected} onClick={() => handleToggleService(service)} className={`min-w-0 flex-1 px-3 py-2.5 text-left transition ${selected ? "bg-[#87ba2f] text-slate-950" : "bg-white/5 text-slate-200 hover:bg-white/10"}`}>
                          <span className="block truncate text-xs font-semibold">{selected ? "✓ " : "+ "}{service.name}</span>
                          <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-wider ${selected ? "text-slate-800/70" : "text-slate-400"}`}>Artículo {service.articleCode || "H"}</span>
                        </button>
                        <button type="button" onClick={() => handleEditService(service)} className="shrink-0 border-l border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-[#d7f0a7] hover:bg-white/15" aria-label={`Editar ${service.name}`}>
                          Editar
                        </button>
                        {!service.id.startsWith("default-") ? (
                          <button type="button" onClick={() => void handleDeleteService(service)} className="shrink-0 border-l border-white/15 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20" aria-label={`Eliminar ${service.name}`}>
                            Eliminar
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-center text-xs text-slate-400">Crea el primer servicio para poder seleccionarlo.</p>
              )}
              {serviceStatus ? <p className="mt-3 text-center text-xs font-semibold text-[#d7f0a7]">{serviceStatus}</p> : null}
            </div>
          </div>
          <div className="mt-4">
            <FormField label="Descripcion del servicio" htmlFor={`${baseId}-service`}>
              <textarea
                id={`${baseId}-service`}
                className={`${fieldClassName} min-h-24 resize-y`}
                value={form.billedService}
                onChange={(event) => {
                  updateField("billedService", event.target.value);
                  const lines = event.target.value.split("\n").map((line) => line.trim().toLocaleLowerCase("es"));
                  setSelectedServiceIds(savedServices.filter((service) => lines.includes(service.name.toLocaleLowerCase("es"))).map((service) => service.id));
                }}
                placeholder="Selecciona uno o varios servicios, o escribe una descripción libre"
              />
            </FormField>
          </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <FormField label="Base imponible" htmlFor={`${baseId}-base`}>
              <input id={`${baseId}-base`} inputMode="decimal" className={fieldClassName} value={form.baseAmount} onChange={(event) => updateField("baseAmount", event.target.value)} />
            </FormField>
          </div>
          <div className="lg:col-span-2">
            <FormField label="IVA (%)" htmlFor={`${baseId}-vat`}>
              <input id={`${baseId}-vat`} inputMode="decimal" className={fieldClassName} value={form.vatRate} onChange={(event) => updateField("vatRate", event.target.value)} />
            </FormField>
          </div>
          <div className="lg:col-span-3">
            <FormField label="Aplicar IRPF" htmlFor={`${baseId}-apply-irpf`}>
              <select
                id={`${baseId}-apply-irpf`}
                className={fieldClassName}
                value={parseDecimal(form.irpfRate) > 0 ? "yes" : "no"}
                onChange={(event) => handleIrpfChoice(event.target.value === "yes")}
              >
                <option value="yes">Sí, aplicar IRPF</option>
                <option value="no">No aplicar IRPF</option>
              </select>
            </FormField>
          </div>
          <div className="lg:col-span-3">
            <FormField label="IRPF (%)" htmlFor={`${baseId}-irpf`}>
              <input
                id={`${baseId}-irpf`}
                inputMode="decimal"
                className={fieldClassName}
                value={form.irpfRate}
                onChange={(event) => {
                  lastIrpfRateRef.current = event.target.value;
                  updateField("irpfRate", event.target.value);
                }}
              />
            </FormField>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#87ba2f]/30 bg-[#87ba2f]/12 px-4 py-3 text-center text-sm text-[#d7f0a7] lg:col-span-12">
            <p className="font-semibold">Total previsto</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatMoney(summary.totalAmount)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={handleGenerateInvoice} className="rounded-2xl bg-[#87ba2f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44]">
            Generar factura
          </button>
          <button type="button" onClick={handlePrintInvoice} disabled={printDisabled} className="rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
            {editingInvoiceId ? "Actualizar e imprimir PDF" : "Imprimir o guardar PDF"}
          </button>
          {editingInvoiceId ? (
            <button type="button" onClick={() => void handleCancelInvoiceEdit()} className="rounded-2xl border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/15">
              Cancelar edicion
            </button>
          ) : null}
        </div>
        </div>
        </details>

        <details className="group mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/55">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left marker:content-none">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Guardar en Drive</span>
            <span className="text-lg text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="px-4 pb-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <FormField label="Buscar carpeta" htmlFor={`${baseId}-drive-folder-query`}>
              <input
                id={`${baseId}-drive-folder-query`}
                className={fieldClassName}
                value={driveFolderQuery}
                onChange={(event) => setDriveFolderQuery(event.target.value)}
                placeholder="JULIO 2026, FACTURAS..."
              />
            </FormField>
            <button type="button" onClick={handleSearchDriveFolders} disabled={isDriveBusy} className="min-h-11 rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
              Buscar
            </button>
          </div>

          <div className="mt-4">
            <FormField label="Carpeta destino" htmlFor={`${baseId}-drive-folder`}>
              <select id={`${baseId}-drive-folder`} className={fieldClassName} value={selectedDriveFolderId} onChange={(event) => setSelectedDriveFolderId(event.target.value)}>
                <option value="">Seleccionar carpeta</option>
                {driveFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="mt-4 flex justify-center">
            <button type="button" onClick={handleSaveInvoiceToDrive} disabled={printDisabled || isDriveBusy || !selectedDriveFolderId} className="rounded-2xl bg-[#87ba2f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44] disabled:cursor-not-allowed disabled:opacity-40">
              {editingInvoiceId ? "Actualizar y guardar en Drive" : "Guardar documento en Drive"}
            </button>
          </div>
          {driveStatus ? <p className="mt-3 break-words text-center text-xs font-semibold text-[#d7f0a7]">{driveStatus}</p> : null}
          </div>
        </details>

        <details className="group mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/55">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left marker:content-none">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Facturas emitidas</span>
            <span className="text-lg text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="px-4 pb-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={() => void refreshIssuedInvoices()} className="rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
              Actualizar
            </button>
          </div>
          {invoiceHistoryStatus ? <p className="mt-3 text-center text-xs font-semibold text-amber-300">{invoiceHistoryStatus}</p> : null}
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
            {issuedInvoices.length ? (
              issuedInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-center transition hover:border-[#87ba2f]/60 hover:bg-white/[0.08] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:text-left"
                >
                  <div
                    className="min-w-0 rounded-xl outline-none focus:ring-2 focus:ring-[#87ba2f]/60"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredInvoiceId(invoice.id)}
                    onMouseLeave={() => setHoveredInvoiceId("")}
                    onFocus={() => setHoveredInvoiceId(invoice.id)}
                    onBlur={() => setHoveredInvoiceId("")}
                  >
                    <p className="truncate text-sm font-semibold text-white">{invoice.series}/{String(invoice.number).padStart(6, "0")} · {invoice.clientName}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#d7f0a7]">{invoice.documentName}</p>
                    <p className="mt-1 text-xs text-slate-300">{formatDate(invoice.issueDate.slice(0, 10))} · {formatMoney(invoice.totalAmount ?? 0)}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                    <button type="button" onClick={() => handleEditIssuedInvoice(invoice)} className="rounded-xl border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
                      Editar
                    </button>
                    <button type="button" onClick={() => handlePrintIssuedInvoice(invoice)} className="rounded-xl bg-[#87ba2f] px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-[#98cb44]">
                      PDF
                    </button>
                    <button type="button" onClick={() => void handleDeleteIssuedInvoice(invoice)} className="rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-3 text-center text-sm text-slate-400">Todavía no hay facturas emitidas guardadas.</p>
            )}
          </div>
          </div>
        </details>
      </div>

      {hoveredInvoice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-label={`Información de la factura ${hoveredInvoice.series}/${String(hoveredInvoice.number).padStart(6, "0")}`}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/15 bg-slate-950 p-6 text-left text-white shadow-[0_28px_90px_rgba(0,0,0,0.65)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Factura emitida</p>
                <h3 className="mt-2 text-2xl font-semibold">{hoveredInvoice.series}/{String(hoveredInvoice.number).padStart(6, "0")}</h3>
                <p className="mt-1 text-sm text-slate-300">{hoveredInvoice.documentName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">{formatDate(hoveredInvoice.issueDate.slice(0, 10))}</p>
                <p className="mt-1 text-2xl font-semibold text-[#b3d87d]">{formatMoney(hoveredInvoice.totalAmount ?? 0)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cliente</p>
                <p className="mt-2 text-base font-semibold">{hoveredInvoice.clientName}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{hoveredInvoice.clientDetails || "Sin dirección o datos adicionales"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Emisor</p>
                <p className="mt-2 text-base font-semibold">{hoveredInvoice.issuer?.legalName || "Sin emisor"}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-300">
                  {hoveredInvoice.issuer?.taxId ? <p>NIF: {hoveredInvoice.issuer.taxId}</p> : null}
                  {hoveredInvoice.issuer?.addressLine1 ? <p>{hoveredInvoice.issuer.addressLine1}</p> : null}
                  {(hoveredInvoice.issuer?.postalCode || hoveredInvoice.issuer?.city) ? <p>{[hoveredInvoice.issuer.postalCode, hoveredInvoice.issuer.city].filter(Boolean).join(" · ")}</p> : null}
                  {hoveredInvoice.issuer?.email ? <p>{hoveredInvoice.issuer.email}</p> : null}
                  {hoveredInvoice.issuer?.phone ? <p>{hoveredInvoice.issuer.phone}</p> : null}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Servicio</p>
                <p className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-[#d7f0a7]">Artículo {hoveredInvoice.articleCode || "H"}</p>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200">{hoveredInvoice.serviceDescription || "Sin descripción"}</p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["Base", formatMoney(hoveredInvoice.subtotalAmount ?? 0)],
                [`IVA ${hoveredInvoice.vatRate ?? 0}%`, formatMoney(hoveredInvoice.vatAmount ?? 0)],
                [`IRPF ${hoveredInvoice.irpfRate ?? 0}%`, `− ${formatMoney(hoveredInvoice.irpfAmount ?? 0)}`],
                ["Total", formatMoney(hoveredInvoice.totalAmount ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/5 p-3 last:col-span-2 sm:last:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
            {hoveredInvoice.issuer?.bankAccount ? <p className="mt-4 text-xs leading-5 text-slate-400">Cuenta: {hoveredInvoice.issuer.bankAccount}</p> : null}
            <p className="mt-5 text-center text-xs text-slate-500">Retira el cursor de la factura para cerrar esta información.</p>
          </div>
        </div>
      ) : null}

      <div className="order-2 flex flex-col items-center rounded-[28px] border border-white/10 bg-[#f7f7f5] p-4 text-center text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-6 xl:order-2">
        <div ref={printPreviewRef} className="pointer-events-none fixed -left-[10000px] top-0 w-[760px]" aria-hidden="true">
          {renderInvoicePreview("w-[760px]")}
        </div>
        <div ref={historicalPrintRef} className="pointer-events-none fixed -left-[10000px] top-0 w-[760px]" aria-hidden="true">
          {historicalPrint ? renderInvoicePreview("w-[760px]", historicalPrint.form, historicalPrint.summary) : null}
        </div>

        <div className="mb-4 flex w-full max-w-[760px] flex-col items-center gap-3 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5d7f1f]">Vista previa</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{previewDocumentName}</h2>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div>
              <p className="text-sm text-slate-500">Factura Nº {previewInvoiceCode}</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatMoney(summary.totalAmount)}</p>
            </div>
            <button type="button" onClick={() => setIsPreviewOpen(true)} className="w-full max-w-xs rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
              Ampliar vista previa
            </button>
          </div>
        </div>

        <div className="relative mx-auto h-[420px] w-full max-w-[320px] overflow-hidden rounded-[30px] border border-slate-200 bg-white sm:h-auto sm:max-w-[760px] sm:overflow-visible sm:border-0 sm:bg-transparent">
          <div className="absolute left-1/2 top-1/2 w-[760px] origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.24] min-[390px]:scale-[0.26] sm:static sm:w-auto sm:translate-x-0 sm:translate-y-0 sm:scale-100">
            {renderInvoicePreview("w-[760px] sm:w-full")}
          </div>
        </div>
      </div>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur sm:p-6" role="dialog" aria-modal="true" aria-label="Vista previa ampliada de factura">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-[#f7f7f5] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-slate-950 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5d7f1f]">Vista previa ampliada</p>
                <p className="mt-1 text-sm font-semibold">{previewDocumentName}</p>
              </div>
              <button type="button" onClick={() => setIsPreviewOpen(false)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Cerrar
              </button>
            </div>
            <div className="overflow-auto p-3 sm:p-6">
              <div className="mx-auto w-[760px] max-w-full">{renderInvoicePreview("w-[760px]")}</div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
