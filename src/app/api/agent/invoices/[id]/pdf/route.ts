import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isForsetiAgentAuthorized } from "@/lib/agent-auth";
import { buildPrintableInvoiceDocument, type InvoiceFormState, type InvoiceLineDraft, type InvoiceSummary } from "@/lib/invoice-printable-document";
import { renderInvoicePdf } from "@/lib/invoice-pdf-server";
import { prisma } from "@/lib/renta-fiscal/prisma";

export const runtime = "nodejs";

function asNumber(value: unknown) { return Number(value ?? 0); }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isForsetiAgentAuthorized(request)) return NextResponse.json({ ok: false, error: "Operador FORSETI no autorizado." }, { status: 401 });
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { issuerProfile: true, client: true, lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) return NextResponse.json({ ok: false, error: "Factura inexistente." }, { status: 404 });
  if (invoice.status !== "ISSUED") return NextResponse.json({ ok: false, error: "Solo se exportan facturas emitidas." }, { status: 409 });
  const form: InvoiceFormState = {
    documentName: invoice.documentName, invoiceDate: invoice.issueDate.toISOString().slice(0, 10), invoiceSeries: invoice.series || "A", invoiceNumber: invoice.numberLabel || String(invoice.number).padStart(6, "0"), articleCode: invoice.articleCode || "H",
    issuerName: invoice.issuerProfile.legalName, issuerTaxId: invoice.issuerProfile.taxId || "", issuerAddress: invoice.issuerProfile.addressLine1 || "", issuerPostalCode: invoice.issuerProfile.postalCode || "", issuerCity: invoice.issuerProfile.city || "", issuerEmail: invoice.issuerProfile.email || "", issuerPhone: invoice.issuerProfile.phone || "", issuerBankAccount: invoice.issuerProfile.bankAccount || "",
    clientName: invoice.client.legalName, clientDetails: [invoice.client.addressLine1, invoice.client.postalCode, invoice.client.city, invoice.client.taxId ? `CIF: ${invoice.client.taxId}` : ""].filter(Boolean).join("\n"), clientNameFontSize: String(invoice.client.nameFontSize), clientDetailsFontSize: String(invoice.client.detailsFontSize), billedService: invoice.serviceDescription, serviceNotes: invoice.notes || "", baseAmount: String(invoice.subtotalAmount), totalDiscountRate: "0", vatRate: String(invoice.vatRate), irpfRate: String(invoice.irpfRate),
  };
  const lines: InvoiceLineDraft[] = invoice.lines.map((line) => ({ id: line.id, articleCode: line.articleCode || "H", description: line.description, unitPrice: String(line.unitPrice), discountRate: line.unitPrice.equals(0) ? "0" : String(asNumber(line.discountAmount) / asNumber(line.unitPrice) * 100), noCost: line.lineTotalAmount.equals(0), notes: "" }));
  const summary: InvoiceSummary = { grossBaseAmount: asNumber(invoice.subtotalAmount), totalDiscountRate: 0, totalDiscountAmount: 0, baseAmount: asNumber(invoice.subtotalAmount), vatRate: asNumber(invoice.vatRate), vatAmount: asNumber(invoice.vatAmount), irpfRate: asNumber(invoice.irpfRate), irpfAmount: asNumber(invoice.irpfAmount), totalAmount: asNumber(invoice.totalAmount) };
  const html = buildPrintableInvoiceDocument(form, summary, lines);
  const pdf = await renderInvoicePdf(html);
  const sha256 = crypto.createHash("sha256").update(pdf).digest("hex");
  const existing = await prisma.invoicePdfExport.findUnique({ where: { invoiceId: invoice.id } });
  if (existing && existing.sha256 !== sha256) {
    return NextResponse.json({ ok: false, error: "La exportación persistida no coincide con el renderer canónico actual; requiere revisión antes de sustituirla." }, { status: 409 });
  }
  await prisma.invoicePdfExport.upsert({
    where: { invoiceId: invoice.id },
    create: { invoiceId: invoice.id, sha256, rendererKey: "invoice-printable-document-v1" },
    update: { rendererKey: "invoice-printable-document-v1" },
  });
  const filename = `Factura-${form.invoiceSeries}-${form.invoiceNumber}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename=\"${filename}\"`, "x-forseti-invoice-sha256": sha256, "x-forseti-pdf-idempotent": existing ? "reused" : "created", "cache-control": "no-store" } });
}
