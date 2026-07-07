"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

type SavedBudgetClient = {
  id: string;
  legalName: string;
  details: string;
};

type DriveFolderOption = {
  id: string;
  name: string;
  webViewLink?: string;
};

type BudgetFormState = {
  documentName: string;
  budgetDate: string;
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
  billedService: string;
  baseAmount: string;
  vatRate: string;
  irpfRate: string;
  serviceTitle: string;
  attentionLine: string;
  generalObjective: string;
  includedServices: string;
  annualBreakdown: string;
  closingNote: string;
};

const INITIAL_STATE: BudgetFormState = {
  documentName: "Presupuesto MLC Design",
  budgetDate: new Date().toISOString().slice(0, 10),
  invoiceSeries: "P",
  invoiceNumber: "000001",
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
  billedService: "",
  baseAmount: "",
  vatRate: "21",
  irpfRate: "15",
  serviceTitle: "SERVICIOS WEB Y POSICIONAMIENTO SEO",
  attentionLine: "",
  generalObjective: "Mantener una presencia digital constante mediante la publicación mensual de contenidos optimizados, su difusión en redes sociales y la generación de recursos visuales para fortalecer la imagen de marca.",
  includedServices:
    "Creación de contenido SEO y adaptaciones para redes sociales\nSe redactará contenido mensual optimizado con palabras clave relevantes. Cada contenido se adaptará como publicación para redes sociales con su copy correspondiente.\n\nPublicaciones en redes sociales\nA partir del contenido web, se publicará de forma planificada en redes sociales, asegurando la coherencia visual y de mensaje con el branding.\n\nContenidos audiovisuales\nSe crearán recursos visuales entre vídeos tipo reel e imágenes gráficas, destinados a campañas promocionales o publicaciones clave.",
  annualBreakdown:
    "Redaccion de contenido web SEO + adaptacion RRSS: 3.600 EUR\nPublicacion y gestion mensual en redes sociales: 1.800 EUR\nCreacion de videos e imagenes promocionales: 3.000 EUR\nCoordinacion general e informes trimestrales: 1.600 EUR",
  closingNote:
    "Este plan tiene un enfoque básico y sostenible, ideal para mantener visibilidad durante todo el año sin necesidad de un despliegue de alta intensidad.",
};

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
  return (value || "presupuesto")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
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

function paragraphsToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${multilineToHtml(paragraph)}</p>`)
    .join("");
}

function linesToHtml(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
}

function buildBudgetCode(form: BudgetFormState) {
  const series = form.invoiceSeries.trim();
  const number = form.invoiceNumber.trim();

  if (series && number) return `${series}/${number}`;
  if (series) return series;
  if (number) return number;
  return "Sin numeracion";
}

function buildIssuerCircleLines(form: BudgetFormState) {
  return [
    form.issuerName,
    form.issuerAddress,
    form.issuerTaxId ? `N.I.F./D.N.I.: ${form.issuerTaxId}` : "",
    form.issuerPostalCode ? `C.P.: ${form.issuerPostalCode}` : "",
    form.issuerCity,
  ].filter(Boolean);
}

function buildClientCircleLines(form: BudgetFormState) {
  if (!form.clientDetails.trim()) {
    return [form.clientName || "CLIENTE", "Direccion pendiente", "CIF pendiente"];
  }

  return [form.clientName || "CLIENTE", ...form.clientDetails.split("\n").map((item) => item.trim()).filter(Boolean)];
}

function buildPrintableBudgetDocument(
  form: BudgetFormState,
  summary: { vatRate: number; irpfRate: number; vatAmount: number; irpfAmount: number; totalAmount: number; baseAmount: number },
) {
  const budgetTitle = escapeHtml(form.documentName || "presupuesto");
  const budgetCode = escapeHtml(buildBudgetCode(form));
  const issuerCircleLines = buildIssuerCircleLines(form).map(escapeHtml).join("<br />");
  const clientCircleLines = buildClientCircleLines(form).map(escapeHtml).join("<br />");
  const billedService = multilineToHtml(form.billedService || "SERVICIO");
  const issuerBank = escapeHtml(form.issuerBankAccount || "");
  const issuerPhone = escapeHtml(form.issuerPhone || "");
  const issuerEmail = escapeHtml(form.issuerEmail || "");
  const budgetDate = escapeHtml(formatDate(form.budgetDate) || form.budgetDate);
  const articleCode = escapeHtml((form.articleCode || "H").trim());
  const serviceTitle = escapeHtml(form.serviceTitle || form.billedService || "SERVICIO");
  const attentionLine = escapeHtml(form.attentionLine || form.clientName || "CLIENTE");
  const generalObjective = paragraphsToHtml(form.generalObjective || "");
  const includedServices = paragraphsToHtml(form.includedServices || "");
  const annualBreakdown = linesToHtml(form.annualBreakdown || "");
  const closingNote = paragraphsToHtml(form.closingNote || "");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${budgetTitle}</title>
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
      .detail-sheet {
        page-break-before: always;
        padding-top: 20mm;
      }
      .detail-top {
        display: flex;
        justify-content: space-between;
        gap: 18mm;
        align-items: flex-start;
      }
      .detail-kicker {
        color: var(--blue);
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .detail-title {
        margin-top: 10px;
        max-width: 112mm;
        color: #1f1f1f;
        font-size: 28px;
        line-height: 1.16;
        font-weight: 700;
        text-transform: uppercase;
      }
      .detail-contact {
        min-width: 48mm;
        text-align: right;
        color: #1f1f1f;
        font-size: 14px;
        line-height: 1.5;
      }
      .detail-contact strong {
        display: block;
        color: #1f1f1f;
        font-size: 26px;
        line-height: 1;
      }
      .detail-section {
        margin-top: 22mm;
      }
      .detail-section.compact {
        margin-top: 14mm;
      }
      .detail-section h2 {
        margin: 0 0 8px;
        color: #1f1f1f;
        font-size: 17px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .detail-section p {
        margin: 0 0 10px;
        color: #333333;
        font-size: 15px;
        line-height: 1.48;
      }
      .detail-section ul {
        margin: 0;
        padding-left: 18px;
      }
      .detail-section li {
        margin: 0 0 8px;
        color: #333333;
        font-size: 15px;
        line-height: 1.42;
      }
      .detail-total {
        margin-top: 10px;
        color: #1f1f1f;
        font-size: 18px;
        font-weight: 700;
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
          <div class="date">FECHA: ${budgetDate}</div>
          <div class="code">PRESUPUESTO No. ${budgetCode}</div>
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
            <div class="title">${escapeHtml(form.clientName || "CLIENTE")}</div>
            <div>${clientCircleLines}</div>
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
              <th class="right">% IRPF</th>
              <th class="right">CUOTA IRPF</th>
              <th class="right">TOTAL PRESUPUESTO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${formatMoney(summary.baseAmount)}</td>
              <td class="right">${formatPercent(summary.vatRate)}</td>
              <td class="right">${formatMoney(summary.vatAmount)}</td>
              <td class="right">${formatPercent(summary.irpfRate, true)}</td>
              <td class="right">-${formatMoney(summary.irpfAmount)}</td>
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
    <main class="sheet detail-sheet">
      <section class="detail-top">
        <div>
          <div class="detail-kicker">DESGLOSE DE PRESUPUESTO</div>
          <div class="detail-title">${serviceTitle}</div>
          <div class="date" style="margin-top: 14px;">Att.: ${attentionLine}</div>
        </div>
        <div class="detail-contact">
          <strong>MLC<span style="color: var(--blue); font-weight: 300;">DESIGN</span></strong>
          ${issuerPhone}<br />
          ${issuerEmail}
        </div>
      </section>

      <section class="detail-section">
        <h2>Objetivo general</h2>
        ${generalObjective}
      </section>

      <section class="detail-section compact">
        <h2>Servicios incluidos</h2>
        ${includedServices}
      </section>

      <section class="detail-section compact">
        <h2>Desglose de presupuesto</h2>
        <ul>${annualBreakdown}</ul>
        <div class="detail-total">Total: ${formatMoney(summary.baseAmount)} IVA no incluido</div>
      </section>

      <section class="detail-section compact">
        ${closingNote}
      </section>
    </main>
  </body>
</html>`;
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

function textBlocksForPreview(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => (
      <p key={paragraph} className="whitespace-pre-line">
        {paragraph}
      </p>
    ));
}

function lineItemsForPreview(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => <li key={line}>{line}</li>);
}

function normalizeSavedClients(clients: SavedBudgetClient[], client: SavedBudgetClient) {
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

function budgetDateFromMonth(value: string) {
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

export function PresupuestosClient() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState(INITIAL_STATE);
  const [generated, setGenerated] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [savedClients, setSavedClients] = useState<SavedBudgetClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientStatus, setClientStatus] = useState("");
  const [driveFolderQuery, setDriveFolderQuery] = useState("");
  const [driveFolders, setDriveFolders] = useState<DriveFolderOption[]>([]);
  const [selectedDriveFolderId, setSelectedDriveFolderId] = useState("");
  const [driveStatus, setDriveStatus] = useState("");
  const [isDriveBusy, setIsDriveBusy] = useState(false);
  const baseId = useId();
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

  const previewDocumentName = form.documentName.trim() || "presupuesto";
  const previewBudgetCode = buildBudgetCode(form);
  const issuerCircleLines = buildIssuerCircleLines(form);
  const clientCircleLines = buildClientCircleLines(form);
  const printDisabled =
    !generated ||
    !form.clientName.trim() ||
    !form.billedService.trim() ||
    summary.baseAmount <= 0;

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        const response = await fetch("/api/facturacion/clientes", { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudieron cargar las fichas.");
        const data = (await response.json()) as { clients?: SavedBudgetClient[] };
        if (!cancelled) setSavedClients(data.clients ?? []);
      } catch {
        if (!cancelled) setClientStatus("No se pudieron cargar las fichas guardadas.");
      }
    }

    loadClients();
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
      documentName: month ? `Presupuesto ${clientName || "cliente"} - ${month}` : current.documentName,
      budgetDate: auditOrigin && month ? budgetDateFromMonth(month) : current.budgetDate,
      clientName: savedClient?.legalName ?? (clientName || current.clientName),
      clientDetails: savedClient?.details ?? current.clientDetails,
      billedService: service || current.billedService,
      serviceTitle: service || current.serviceTitle,
      attentionLine: savedClient?.legalName ?? (clientName || current.attentionLine),
      baseAmount: base ? formatInvoiceBaseParam(base) : current.baseAmount,
    }));
    setSelectedClientId(savedClient?.id ?? "");
    setGenerated(false);

    if (auditOrigin) {
      let cancelled = false;

      async function loadNextBudgetNumber() {
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
          // El presupuesto sigue siendo editable si no se puede leer la numeracion.
        }
      }

      loadNextBudgetNumber();
      return () => {
        cancelled = true;
      };
    }
  }, [savedClients, searchParams]);

  function updateField<Key extends keyof BudgetFormState>(key: Key, value: BudgetFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
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
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { client?: SavedBudgetClient; error?: string };
      if (!response.ok || !data.client) throw new Error(data.error || "No se pudo guardar la ficha.");

      setSavedClients((current) => normalizeSavedClients(current, data.client!));
      setSelectedClientId(data.client.id);
      setClientStatus("Ficha guardada.");
    } catch (error) {
      setClientStatus(error instanceof Error ? error.message : "No se pudo guardar la ficha.");
    }
  }

  function handleGenerateBudget() {
    setGenerated(true);
  }

  function handlePrintBudget() {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1080,height=1440");
    if (!printWindow) return;

    const html = buildPrintableBudgetDocument(form, summary);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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

  async function handleSaveBudgetToDrive() {
    if (!selectedDriveFolderId) {
      setDriveStatus("Selecciona una carpeta de Drive antes de guardar.");
      return;
    }

    setIsDriveBusy(true);
    setDriveStatus("Guardando documento en Drive...");

    try {
      const html = buildPrintableBudgetDocument(form, summary);
      const response = await fetch("/api/drive/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: selectedDriveFolderId,
          fileName: sanitizeDocumentName(`${previewDocumentName}-${previewBudgetCode}`),
          html,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        file?: { name?: string; webViewLink?: string };
        error?: string;
      };
      if (!response.ok || !data.file) throw new Error(data.error || "No se pudo guardar el documento en Drive.");
      setDriveStatus(data.file.webViewLink ? `Guardado en Drive: ${data.file.name} - ${data.file.webViewLink}` : `Guardado en Drive: ${data.file.name}`);
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "No se pudo guardar el documento en Drive.");
    } finally {
      setIsDriveBusy(false);
    }
  }

  const renderBudgetPreview = (className = "") => (
    <div className={`flex flex-col gap-5 ${className}`}>
      <article className="w-full overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)]"> 
          <div className="px-8 pt-8 pb-0">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white px-1 py-1">
                  <Image src="/logo-mlc-design.png" alt="MLC Design" width={240} height={90} className="h-auto w-52" />
                </div>
              </div>
              <div className="pt-2 text-right">
                <p className="text-[18px] font-medium text-sky-400">FECHA: {formatDate(form.budgetDate) || "Sin fecha"}</p>
                <div className="mt-6 text-right font-light tracking-[0.02em] text-slate-200">
                  <p className="text-[28px] leading-tight">PRESUPUESTO No.</p>
                  <p className="mt-1 text-[26px] leading-tight">{previewBudgetCode}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 h-[2px] bg-[linear-gradient(90deg,#1f1f1f_0_38%,#78c8ee_38%_100%)]" />

            <div className="mt-10 flex items-start justify-between gap-6">
              <div className="flex h-[210px] w-[210px] items-center justify-center rounded-full bg-sky-300 px-6 text-center text-white">
                <div className="space-y-0.5 text-[14px] leading-[1.12]">
                  <p className="text-[17px] font-bold">{form.issuerName || "EMISOR"}</p>
                  {circleLinesForPreview(issuerCircleLines.slice(1))}
                </div>
              </div>
              <div className="flex h-[210px] w-[210px] items-center justify-center rounded-full bg-[#1f1f1f] px-6 text-center text-white">
                <div className="space-y-0.5 text-[14px] leading-[1.12]">
                  <p className="text-[17px] font-bold">{form.clientName || "CLIENTE"}</p>
                  {circleLinesForPreview(clientCircleLines.slice(1))}
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
                    <th className="pb-3 text-right font-normal">% IRPF</th>
                    <th className="pb-3 text-right font-normal">CUOTA IRPF</th>
                    <th className="pb-3 text-right font-normal">TOTAL PRESUPUESTO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-[16px] text-slate-800">
                    <td className="pt-4">{formatMoney(summary.baseAmount)}</td>
                    <td className="pt-4 text-right">{formatPercent(summary.vatRate)}</td>
                    <td className="pt-4 text-right">{formatMoney(summary.vatAmount)}</td>
                    <td className="pt-4 text-right">{formatPercent(summary.irpfRate, true)}</td>
                    <td className="pt-4 text-right">-{formatMoney(summary.irpfAmount)}</td>
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

      <article className="w-full rounded-[30px] border border-slate-200 bg-white px-8 py-8 text-left text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.12)]">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-[22px] font-bold uppercase tracking-[0.08em] text-sky-400">DESGLOSE DE PRESUPUESTO</p>
            <h2 className="mt-3 max-w-[520px] text-[28px] font-bold uppercase leading-tight text-slate-900">
              {form.serviceTitle || form.billedService || "SERVICIO"}
            </h2>
            <p className="mt-3 text-[15px] text-slate-500">Att.: {form.attentionLine || form.clientName || "CLIENTE"}</p>
          </div>
          <div className="min-w-40 text-right text-[15px] leading-6 text-slate-700">
            <p className="text-[28px] font-semibold leading-none text-slate-950">
              MLC<span className="font-light text-sky-400">DESIGN</span>
            </p>
            <p className="mt-3">{form.issuerPhone || "Telefono"}</p>
            <p>{form.issuerEmail || "email@dominio.com"}</p>
          </div>
        </div>

        <div className="mt-12 space-y-8 text-[15px] leading-6 text-slate-700">
          <section>
            <h3 className="mb-3 text-[17px] font-bold uppercase tracking-[0.04em] text-slate-950">Objetivo general</h3>
            <div className="space-y-3">{textBlocksForPreview(form.generalObjective)}</div>
          </section>

          <section>
            <h3 className="mb-3 text-[17px] font-bold uppercase tracking-[0.04em] text-slate-950">Servicios incluidos</h3>
            <div className="space-y-3">{textBlocksForPreview(form.includedServices)}</div>
          </section>

          <section>
            <h3 className="mb-3 text-[17px] font-bold uppercase tracking-[0.04em] text-slate-950">Desglose de presupuesto</h3>
            <ul className="list-disc space-y-2 pl-5">{lineItemsForPreview(form.annualBreakdown)}</ul>
            <p className="mt-4 text-[18px] font-bold text-slate-950">Total: {formatMoney(summary.baseAmount)} IVA no incluido</p>
          </section>

          <section className="space-y-3">{textBlocksForPreview(form.closingNote)}</section>
        </div>
      </article>
    </div>
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.55fr)] xl:items-start">
      <div className="order-1 rounded-[28px] border border-white/10 bg-[#0f1728] p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] xl:order-1 xl:sticky xl:top-6">
        <div className="mb-6 flex items-start justify-center gap-4 text-center">
          <div className="flex w-full flex-col items-center text-center">
            <p className="w-full text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#a3cf56]">
              Plantilla tipo MLC
            </p>
            <h2 className="mx-auto mt-2 w-full max-w-sm text-center text-2xl font-semibold text-white">
              Presupuesto basado en la plantilla de facturas
            </h2>
            <p className="mx-auto mt-3 w-full max-w-sm text-center text-sm leading-6 text-slate-300">
              Esta version adapta la estructura de facturas para preparar presupuestos con cabecera limpia, numero grande, cliente, tabla simple, resumen fiscal y pie negro.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <FormField label="Nombre del documento" htmlFor={`${baseId}-document`}>
            <input id={`${baseId}-document`} className={fieldClassName} value={form.documentName} onChange={(event) => updateField("documentName", event.target.value)} />
          </FormField>
        </div>

        <div className="mx-auto mt-4 grid w-full max-w-lg justify-items-center gap-4 sm:grid-cols-3">
          <div>
            <FormField label="Fecha de presupuesto" htmlFor={`${baseId}-date`}>
              <input id={`${baseId}-date`} type="date" className={fieldClassName} value={form.budgetDate} onChange={(event) => updateField("budgetDate", event.target.value)} />
            </FormField>
          </div>
          <div>
            <FormField label="Serie" htmlFor={`${baseId}-series`}>
              <input id={`${baseId}-series`} className={fieldClassName} value={form.invoiceSeries} onChange={(event) => updateField("invoiceSeries", event.target.value)} />
            </FormField>
          </div>
          <div>
            <FormField label="Numero" htmlFor={`${baseId}-number`}>
              <input id={`${baseId}-number`} className={fieldClassName} value={form.invoiceNumber} onChange={(event) => updateField("invoiceNumber", event.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Emisor</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
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
              <FormField label="Cuenta bancaria" htmlFor={`${baseId}-issuer-bank`}>
                <input id={`${baseId}-issuer-bank`} className={fieldClassName} value={form.issuerBankAccount} onChange={(event) => updateField("issuerBankAccount", event.target.value)} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Cliente y linea</p>

          <div className="mx-auto mt-4 grid w-full max-w-xl gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
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

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <FormField label="Nombre del cliente" htmlFor={`${baseId}-client`}>
                <input id={`${baseId}-client`} className={fieldClassName} value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} />
              </FormField>
            </div>
            <div className="lg:col-span-4">
              <FormField label="Articulo" htmlFor={`${baseId}-article`}>
                <input id={`${baseId}-article`} className={fieldClassName} value={form.articleCode} onChange={(event) => updateField("articleCode", event.target.value)} />
              </FormField>
            </div>
          </div>
          <div className="mt-4">
            <FormField label="Datos del cliente" htmlFor={`${baseId}-details`}>
              <textarea id={`${baseId}-details`} className={`${fieldClassName} min-h-28 resize-y`} value={form.clientDetails} onChange={(event) => updateField("clientDetails", event.target.value)} placeholder={"PLAZA ...\n02001 - ALBACETE\nCIF: ...\nTlf: ..."} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Descripcion del servicio" htmlFor={`${baseId}-service`}>
              <textarea id={`${baseId}-service`} className={`${fieldClassName} min-h-24 resize-y`} value={form.billedService} onChange={(event) => updateField("billedService", event.target.value)} placeholder="SERVICIO MARKETING ONLINE" />
            </FormField>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Desglose del servicio</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <FormField label="Titulo del servicio" htmlFor={`${baseId}-service-title`}>
                <input id={`${baseId}-service-title`} className={fieldClassName} value={form.serviceTitle} onChange={(event) => updateField("serviceTitle", event.target.value)} />
              </FormField>
            </div>
            <div className="lg:col-span-4">
              <FormField label="Att." htmlFor={`${baseId}-attention`}>
                <input id={`${baseId}-attention`} className={fieldClassName} value={form.attentionLine} onChange={(event) => updateField("attentionLine", event.target.value)} placeholder={form.clientName || "Cliente"} />
              </FormField>
            </div>
            <div className="lg:col-span-12">
              <FormField label="Objetivo general" htmlFor={`${baseId}-objective`}>
                <textarea id={`${baseId}-objective`} className={`${fieldClassName} min-h-28 resize-y`} value={form.generalObjective} onChange={(event) => updateField("generalObjective", event.target.value)} />
              </FormField>
            </div>
            <div className="lg:col-span-12">
              <FormField label="Servicios incluidos" htmlFor={`${baseId}-included-services`}>
                <textarea id={`${baseId}-included-services`} className={`${fieldClassName} min-h-44 resize-y`} value={form.includedServices} onChange={(event) => updateField("includedServices", event.target.value)} />
              </FormField>
            </div>
            <div className="lg:col-span-12">
              <FormField label="Desglose economico" htmlFor={`${baseId}-annual-breakdown`}>
                <textarea id={`${baseId}-annual-breakdown`} className={`${fieldClassName} min-h-32 resize-y`} value={form.annualBreakdown} onChange={(event) => updateField("annualBreakdown", event.target.value)} />
              </FormField>
            </div>
            <div className="lg:col-span-12">
              <FormField label="Nota final" htmlFor={`${baseId}-closing-note`}>
                <textarea id={`${baseId}-closing-note`} className={`${fieldClassName} min-h-24 resize-y`} value={form.closingNote} onChange={(event) => updateField("closingNote", event.target.value)} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <FormField label="Base imponible" htmlFor={`${baseId}-base`}>
              <input id={`${baseId}-base`} inputMode="decimal" className={fieldClassName} value={form.baseAmount} onChange={(event) => updateField("baseAmount", event.target.value)} />
            </FormField>
          </div>
          <div className="lg:col-span-3">
            <FormField label="IVA (%)" htmlFor={`${baseId}-vat`}>
              <input id={`${baseId}-vat`} inputMode="decimal" className={fieldClassName} value={form.vatRate} onChange={(event) => updateField("vatRate", event.target.value)} />
            </FormField>
          </div>
          <div className="lg:col-span-3">
            <FormField label="IRPF (%)" htmlFor={`${baseId}-irpf`}>
              <input id={`${baseId}-irpf`} inputMode="decimal" className={fieldClassName} value={form.irpfRate} onChange={(event) => updateField("irpfRate", event.target.value)} />
            </FormField>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#87ba2f]/30 bg-[#87ba2f]/12 px-4 py-3 text-center text-sm text-[#d7f0a7] lg:col-span-12">
            <p className="font-semibold">Total previsto</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatMoney(summary.totalAmount)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={handleGenerateBudget} className="rounded-2xl bg-[#87ba2f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44]">
            Generar presupuesto
          </button>
          <button type="button" onClick={handlePrintBudget} disabled={printDisabled} className="rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
            Imprimir o guardar PDF
          </button>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Guardar en Drive</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <FormField label="Buscar carpeta" htmlFor={`${baseId}-drive-folder-query`}>
              <input
                id={`${baseId}-drive-folder-query`}
                className={fieldClassName}
                value={driveFolderQuery}
                onChange={(event) => setDriveFolderQuery(event.target.value)}
                placeholder="JULIO 2026, PRESUPUESTOS..."
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
            <button type="button" onClick={handleSaveBudgetToDrive} disabled={printDisabled || isDriveBusy || !selectedDriveFolderId} className="rounded-2xl bg-[#87ba2f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44] disabled:cursor-not-allowed disabled:opacity-40">
              Guardar documento en Drive
            </button>
          </div>
          {driveStatus ? <p className="mt-3 break-words text-center text-xs font-semibold text-[#d7f0a7]">{driveStatus}</p> : null}
        </div>
      </div>

      <div className="order-2 flex flex-col items-center rounded-[28px] border border-white/10 bg-[#f7f7f5] p-4 text-center text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-6 xl:order-2">
        <div className="mb-4 flex w-full max-w-[760px] flex-col items-center gap-3 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5d7f1f]">Vista previa</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{previewDocumentName}</h2>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div>
              <p className="text-sm text-slate-500">Presupuesto No. {previewBudgetCode}</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{formatMoney(summary.totalAmount)}</p>
            </div>
            <button type="button" onClick={() => setIsPreviewOpen(true)} className="w-full max-w-xs rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
              Ampliar vista previa
            </button>
          </div>
        </div>

        <div className="relative mx-auto h-[420px] w-full max-w-[320px] overflow-hidden rounded-[30px] border border-slate-200 bg-white sm:h-auto sm:max-w-[760px] sm:overflow-visible sm:border-0 sm:bg-transparent">
          <div className="absolute left-1/2 top-1/2 w-[760px] origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.24] min-[390px]:scale-[0.26] sm:static sm:w-auto sm:translate-x-0 sm:translate-y-0 sm:scale-100">
            {renderBudgetPreview("w-[760px] sm:w-full")}
          </div>
        </div>
      </div>

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur sm:p-6" role="dialog" aria-modal="true" aria-label="Vista previa ampliada de presupuesto">
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
              <div className="mx-auto w-[760px] max-w-full">{renderBudgetPreview("w-[760px]")}</div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}


