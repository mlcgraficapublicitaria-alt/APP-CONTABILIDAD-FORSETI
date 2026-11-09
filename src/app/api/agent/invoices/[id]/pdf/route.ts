import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isForsetiAgentAuthorized } from "@/lib/agent-auth";
import { buildPrintableInvoiceDocument, type InvoiceFormState, type InvoiceLineDraft, type InvoiceSummary } from "@/lib/invoice-printable-document";
import { prisma } from "@/lib/renta-fiscal/prisma";

export const runtime = "nodejs";
// Cualquier cambio visual requiere regenerar: nunca se devuelve un PDF creado
// por otro renderer como si fuese la plantilla canónica actual.
const CANONICAL_RENDERER_KEY = "invoice-manual-print-chromium-v2";

function asNumber(value: unknown) { return Number(value ?? 0); }

// Excepción deliberadamente cerrada para la validación E2E solicitada. No abre
// la exportación de borradores comerciales ni puede usarse para emitirlos.
function isApprovedPdfTestDraft(invoice: { status: string; series: string | null; numberLabel: string; documentName: string }) {
  return invoice.status === "DRAFT"
    && invoice.series === "TEST"
    && invoice.numberLabel === "000001"
    && invoice.documentName === "PRUEBA EXPORTACIÓN PDF — NO EMITIR";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isForsetiAgentAuthorized(request)) return NextResponse.json({ ok: false, error: "Operador FORSETI no autorizado." }, { status: 401 });
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { issuerProfile: true, client: true, lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) return NextResponse.json({ ok: false, error: "Factura inexistente." }, { status: 404 });
  if (invoice.status !== "ISSUED" && !isApprovedPdfTestDraft(invoice)) {
    return NextResponse.json({ ok: false, error: "Solo se exportan facturas emitidas; el único borrador autorizado es el fixture TEST/000001." }, { status: 409 });
  }
  const existing = await prisma.invoicePdfExport.findUnique({ where: { invoiceId: invoice.id } });
  if (existing && existing.rendererKey === CANONICAL_RENDERER_KEY && existing.pdfBytes.length >= 512) {
    const filename = `Factura-${invoice.series || "A"}-${invoice.numberLabel || String(invoice.number).padStart(6, "0")}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
    return new NextResponse(Uint8Array.from(existing.pdfBytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename=\"${filename}\"`, "x-forseti-invoice-sha256": existing.sha256, "x-forseti-pdf-idempotent": "reused", "cache-control": "no-store" } });
  }
  const form: InvoiceFormState = {
    documentName: invoice.documentName, invoiceDate: invoice.issueDate.toISOString().slice(0, 10), invoiceSeries: invoice.series || "A", invoiceNumber: invoice.numberLabel || String(invoice.number).padStart(6, "0"), articleCode: invoice.articleCode || "H",
    issuerName: invoice.issuerProfile.legalName, issuerTaxId: invoice.issuerProfile.taxId || "", issuerAddress: invoice.issuerProfile.addressLine1 || "", issuerPostalCode: invoice.issuerProfile.postalCode || "", issuerCity: invoice.issuerProfile.city || "", issuerEmail: invoice.issuerProfile.email || "", issuerPhone: invoice.issuerProfile.phone || "", issuerBankAccount: invoice.issuerProfile.bankAccount || "",
    clientName: invoice.client.legalName, clientDetails: [invoice.client.addressLine1, invoice.client.postalCode, invoice.client.city, invoice.client.taxId ? `CIF: ${invoice.client.taxId}` : ""].filter(Boolean).join("\n"), clientNameFontSize: String(invoice.client.nameFontSize), clientDetailsFontSize: String(invoice.client.detailsFontSize), billedService: invoice.serviceDescription, serviceNotes: invoice.notes || "", baseAmount: String(invoice.subtotalAmount), totalDiscountRate: "0", vatRate: String(invoice.vatRate), irpfRate: String(invoice.irpfRate),
  };
  const lines: InvoiceLineDraft[] = invoice.lines.map((line) => ({ id: line.id, articleCode: line.articleCode || "H", description: line.description, unitPrice: String(line.unitPrice), discountRate: line.unitPrice.equals(0) ? "0" : String(asNumber(line.discountAmount) / asNumber(line.unitPrice) * 100), noCost: line.lineTotalAmount.equals(0), notes: "" }));
  const summary: InvoiceSummary = { grossBaseAmount: asNumber(invoice.subtotalAmount), totalDiscountRate: 0, totalDiscountAmount: 0, baseAmount: asNumber(invoice.subtotalAmount), vatRate: asNumber(invoice.vatRate), vatAmount: asNumber(invoice.vatAmount), irpfRate: asNumber(invoice.irpfRate), irpfAmount: asNumber(invoice.irpfAmount), totalAmount: asNumber(invoice.totalAmount) };
  const html = buildPrintableInvoiceDocument(form, summary, lines);
  const { renderInvoicePdf } = await import("@/lib/invoice-pdf-server");
  const pdf = await renderInvoicePdf(html);
  const sha256 = crypto.createHash("sha256").update(pdf).digest("hex");
  try {
    if (existing) {
      await prisma.invoicePdfExport.update({ where: { invoiceId: invoice.id }, data: { sha256, rendererKey: CANONICAL_RENDERER_KEY, pdfBytes: Uint8Array.from(pdf) } });
    } else {
      await prisma.invoicePdfExport.create({ data: { invoiceId: invoice.id, sha256, rendererKey: CANONICAL_RENDERER_KEY, pdfBytes: Uint8Array.from(pdf) } });
    }
  } catch (error) {
    const concurrent = await prisma.invoicePdfExport.findUnique({ where: { invoiceId: invoice.id } });
    if (!concurrent) throw error;
    return new NextResponse(Uint8Array.from(concurrent.pdfBytes), { headers: { "content-type": "application/pdf", "x-forseti-invoice-sha256": concurrent.sha256, "x-forseti-pdf-idempotent": "reused", "cache-control": "no-store" } });
  }
  const filename = `Factura-${form.invoiceSeries}-${form.invoiceNumber}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename=\"${filename}\"`, "x-forseti-invoice-sha256": sha256, "x-forseti-pdf-idempotent": "created", "cache-control": "no-store" } });
}
