"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";

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
  billedService: string;
  baseAmount: string;
  vatRate: string;
  irpfRate: string;
};

const INITIAL_STATE: InvoiceFormState = {
  documentName: "Factura MLC Design",
  invoiceDate: new Date().toISOString().slice(0, 10),
  invoiceSeries: "A",
  invoiceNumber: "000430",
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
  return (value || "factura")
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

function buildInvoiceCode(form: InvoiceFormState) {
  const series = form.invoiceSeries.trim();
  const number = form.invoiceNumber.trim();

  if (series && number) return `${series}/${number}`;
  if (series) return series;
  if (number) return number;
  return "Sin numeracion";
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

function buildPrintableInvoiceDocument(
  form: InvoiceFormState,
  summary: { vatRate: number; irpfRate: number; vatAmount: number; irpfAmount: number; totalAmount: number; baseAmount: number },
) {
  const invoiceTitle = escapeHtml(form.documentName || "Factura");
  const invoiceCode = escapeHtml(buildInvoiceCode(form));
  const issuerCircleLines = buildIssuerCircleLines(form).map(escapeHtml).join("<br />");
  const clientCircleLines = buildClientCircleLines(form).map(escapeHtml).join("<br />");
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
        line-height: 1.35;
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
        margin-bottom: 8px;
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
              <th class="right">TOTAL FACTURA</th>
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
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-100">{label}</span>
      {children}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[#87ba2f] focus:ring-2 focus:ring-[#87ba2f]/30";
}

function circleLinesForPreview(lines: string[]) {
  return lines.map((line) => <p key={line}>{line}</p>);
}

export function FacturacionClient() {
  const [form, setForm] = useState(INITIAL_STATE);
  const [generated, setGenerated] = useState(false);
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

  const previewDocumentName = form.documentName.trim() || "Factura";
  const previewInvoiceCode = buildInvoiceCode(form);
  const issuerCircleLines = buildIssuerCircleLines(form);
  const clientCircleLines = buildClientCircleLines(form);
  const printDisabled =
    !generated ||
    !form.clientName.trim() ||
    !form.billedService.trim() ||
    summary.baseAmount <= 0;

  function updateField<Key extends keyof InvoiceFormState>(key: Key, value: InvoiceFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleGenerateInvoice() {
    setGenerated(true);
  }

  function handlePrintInvoice() {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1080,height=1440");
    if (!printWindow) return;

    const html = buildPrintableInvoiceDocument(form, summary);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.55fr)] xl:items-start">
      <div className="order-1 rounded-[28px] border border-white/10 bg-[#0f1728] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] xl:order-1 xl:sticky xl:top-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a3cf56]">
              Plantilla tipo MLC
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Factura basada en el ejemplo subido
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Esta versión replica la estructura del PDF de ejemplo: cabecera limpia, número grande, círculos de emisor y cliente, tabla simple, resumen fiscal y pie negro.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <FormField label="Nombre del documento" htmlFor={`${baseId}-document`}>
              <input id={`${baseId}-document`} className={fieldClassName} value={form.documentName} onChange={(event) => updateField("documentName", event.target.value)} />
            </FormField>
          </div>
          <div className="xl:col-span-3">
            <FormField label="Fecha de factura" htmlFor={`${baseId}-date`}>
              <input id={`${baseId}-date`} type="date" className={fieldClassName} value={form.invoiceDate} onChange={(event) => updateField("invoiceDate", event.target.value)} />
            </FormField>
          </div>
          <div className="xl:col-span-2">
            <FormField label="Serie" htmlFor={`${baseId}-series`}>
              <input id={`${baseId}-series`} className={fieldClassName} value={form.invoiceSeries} onChange={(event) => updateField("invoiceSeries", event.target.value)} />
            </FormField>
          </div>
          <div className="xl:col-span-2">
            <FormField label="Numero" htmlFor={`${baseId}-number`}>
              <input id={`${baseId}-number`} className={fieldClassName} value={form.invoiceNumber} onChange={(event) => updateField("invoiceNumber", event.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Emisor</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <FormField label="Nombre del emisor" htmlFor={`${baseId}-issuer-name`}>
                <input id={`${baseId}-issuer-name`} className={fieldClassName} value={form.issuerName} onChange={(event) => updateField("issuerName", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-5">
              <FormField label="NIF / CIF" htmlFor={`${baseId}-issuer-tax`}>
                <input id={`${baseId}-issuer-tax`} className={fieldClassName} value={form.issuerTaxId} onChange={(event) => updateField("issuerTaxId", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-7">
              <FormField label="Direccion" htmlFor={`${baseId}-issuer-address`}>
                <input id={`${baseId}-issuer-address`} className={fieldClassName} value={form.issuerAddress} onChange={(event) => updateField("issuerAddress", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-2">
              <FormField label="Codigo postal" htmlFor={`${baseId}-issuer-postal`}>
                <input id={`${baseId}-issuer-postal`} className={fieldClassName} value={form.issuerPostalCode} onChange={(event) => updateField("issuerPostalCode", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-3">
              <FormField label="Ciudad" htmlFor={`${baseId}-issuer-city`}>
                <input id={`${baseId}-issuer-city`} className={fieldClassName} value={form.issuerCity} onChange={(event) => updateField("issuerCity", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-4">
              <FormField label="Telefono" htmlFor={`${baseId}-issuer-phone`}>
                <input id={`${baseId}-issuer-phone`} className={fieldClassName} value={form.issuerPhone} onChange={(event) => updateField("issuerPhone", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-4">
              <FormField label="Email" htmlFor={`${baseId}-issuer-email`}>
                <input id={`${baseId}-issuer-email`} className={fieldClassName} value={form.issuerEmail} onChange={(event) => updateField("issuerEmail", event.target.value)} />
              </FormField>
            </div>
            <div className="xl:col-span-4">
              <FormField label="Cuenta bancaria" htmlFor={`${baseId}-issuer-bank`}>
                <input id={`${baseId}-issuer-bank`} className={fieldClassName} value={form.issuerBankAccount} onChange={(event) => updateField("issuerBankAccount", event.target.value)} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b3d87d]">Cliente y linea</p>
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
          <div className="lg:col-span-2">
            <FormField label="IRPF (%)" htmlFor={`${baseId}-irpf`}>
              <input id={`${baseId}-irpf`} inputMode="decimal" className={fieldClassName} value={form.irpfRate} onChange={(event) => updateField("irpfRate", event.target.value)} />
            </FormField>
          </div>
          <div className="lg:col-span-4 rounded-2xl border border-[#87ba2f]/30 bg-[#87ba2f]/12 px-4 py-3 text-right text-sm text-[#d7f0a7]">
            <p className="font-semibold">Total previsto</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatMoney(summary.totalAmount)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={handleGenerateInvoice} className="rounded-2xl bg-[#87ba2f] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#98cb44]">
            Generar factura
          </button>
          <button type="button" onClick={handlePrintInvoice} disabled={printDisabled} className="rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
            Imprimir o guardar PDF
          </button>
        </div>
      </div>

      <div className="order-2 rounded-[28px] border border-white/10 bg-[#f7f7f5] p-4 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:p-6 xl:order-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5d7f1f]">Vista previa</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{previewDocumentName}</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Factura Nº {previewInvoiceCode}</p>
            <p className="mt-1 text-xl font-semibold text-slate-950">{formatMoney(summary.totalAmount)}</p>
          </div>
        </div>

        <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)]">
          <div className="px-8 pt-8 pb-0">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white px-1 py-1">
                  <Image src="/logo-mlc-design.png" alt="MLC Design" width={240} height={90} className="h-auto w-52" />
                </div>
              </div>
              <div className="pt-2 text-right">
                <p className="text-[18px] font-medium text-sky-400">FECHA: {formatDate(form.invoiceDate) || "Sin fecha"}</p>
                <p className="mt-6 text-[46px] font-light tracking-[0.02em] text-slate-200">FACTURA Nº {previewInvoiceCode}</p>
              </div>
            </div>

            <div className="mt-5 h-[2px] bg-[linear-gradient(90deg,#1f1f1f_0_38%,#78c8ee_38%_100%)]" />

            <div className="mt-10 flex items-start justify-between gap-6">
              <div className="flex h-[210px] w-[210px] items-center justify-center rounded-full bg-sky-300 px-6 text-center text-white">
                <div className="space-y-1 text-[14px] leading-[1.35]">
                  <p className="text-[17px] font-bold">{form.issuerName || "EMISOR"}</p>
                  {circleLinesForPreview(issuerCircleLines.slice(1))}
                </div>
              </div>
              <div className="flex h-[210px] w-[210px] items-center justify-center rounded-full bg-[#1f1f1f] px-6 text-center text-white">
                <div className="space-y-1 text-[14px] leading-[1.35]">
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
                    <th className="pb-3 text-right font-normal">TOTAL FACTURA</th>
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
      </div>
    </section>
  );
}
