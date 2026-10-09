import { NextResponse } from "next/server";
import { isForsetiAgentAuthorized } from "@/lib/agent-auth";
import { prisma } from "@/lib/renta-fiscal/prisma";

type ClientUpsertInput = {
  legalName?: string;
  taxId?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

type DraftLineInput = {
  articleCode?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
};

type InvoiceDraftInput = {
  documentName?: string;
  series?: string;
  number?: string | number;
  issueDate?: string;
  clientId?: string;
  clientName?: string;
  serviceDescription?: string;
  notes?: string;
  vatRate?: number;
  irpfRate?: number;
  lines?: DraftLineInput[];
};

type AgentRequestBody = {
  operation?: string;
  limit?: number;
  client?: ClientUpsertInput;
  invoice?: InvoiceDraftInput;
};

function clean(value: string | undefined) {
  return value?.trim() || null;
}

function finiteNumber(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function normalizeNumberLabel(value: string | number | undefined) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function numericInvoiceNumber(value: string | number | undefined) {
  const parsed = Number.parseInt(String(value ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido.";
  return NextResponse.json({ ok: false, error: `No se pudo completar la operación FORSETI: ${message}` }, { status: 400 });
}

export async function POST(request: Request) {
  if (!isForsetiAgentAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Operador FORSETI no autorizado." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as AgentRequestBody;
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 100);

  if (body.operation === "clients-list") {
    const data = await prisma.invoiceClient.findMany({
      select: { id: true, legalName: true, taxId: true, email: true, phone: true, updatedAt: true },
      orderBy: { legalName: "asc" }, take: limit,
    });
    return NextResponse.json({ ok: true, operation: body.operation, data });
  }
  if (body.operation === "invoices-list") {
    const data = await prisma.invoice.findMany({
      select: { id: true, documentName: true, series: true, numberLabel: true, issueDate: true, status: true, totalAmount: true, client: { select: { legalName: true } } },
      orderBy: { issueDate: "desc" }, take: limit,
    });
    return NextResponse.json({ ok: true, operation: body.operation, data });
  }
  if (body.operation === "services-list") {
    const data = await prisma.invoiceService.findMany({ select: { id: true, name: true, articleCode: true }, orderBy: { name: "asc" }, take: limit });
    return NextResponse.json({ ok: true, operation: body.operation, data });
  }
  if (body.operation === "client-upsert") {
    const input = body.client ?? {};
    const legalName = clean(input.legalName);
    if (!legalName) {
      return NextResponse.json({ ok: false, error: "El nombre legal del cliente es obligatorio." }, { status: 400 });
    }

    try {
      const taxId = clean(input.taxId);
      const existing = taxId
        ? await prisma.invoiceClient.findFirst({ where: { OR: [{ taxId }, { legalName }] } })
        : await prisma.invoiceClient.findFirst({ where: { legalName } });
      const data = {
        legalName,
        taxId,
        addressLine1: clean(input.addressLine1),
        addressLine2: clean(input.addressLine2),
        postalCode: clean(input.postalCode),
        city: clean(input.city),
        province: clean(input.province),
        country: clean(input.country),
        email: clean(input.email),
        phone: clean(input.phone),
        notes: clean(input.notes),
      };
      const client = existing
        ? await prisma.invoiceClient.update({ where: { id: existing.id }, data })
        : await prisma.invoiceClient.create({ data });
      return NextResponse.json({
        ok: true,
        operation: body.operation,
        created: !existing,
        data: { id: client.id, legalName: client.legalName, taxId: client.taxId, updatedAt: client.updatedAt },
      }, { status: existing ? 200 : 201 });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (body.operation === "invoice-draft-create") {
    const input = body.invoice ?? {};
    const series = clean(input.series) || "A";
    const numberLabel = normalizeNumberLabel(input.number);
    const number = numericInvoiceNumber(input.number);
    const documentName = clean(input.documentName);
    const serviceDescription = clean(input.serviceDescription) || "Servicio";
    const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();

    if (!number || !numberLabel) {
      return NextResponse.json({ ok: false, error: "El número de factura es obligatorio." }, { status: 400 });
    }
    if (!documentName) {
      return NextResponse.json({ ok: false, error: "El nombre del documento es obligatorio." }, { status: 400 });
    }
    if (Number.isNaN(issueDate.getTime())) {
      return NextResponse.json({ ok: false, error: "La fecha de factura no es válida." }, { status: 400 });
    }
    if (!input.clientId?.trim() && !input.clientName?.trim()) {
      return NextResponse.json({ ok: false, error: "El cliente de la factura es obligatorio." }, { status: 400 });
    }

    try {
      const duplicate = await prisma.invoice.findFirst({ where: { series, numberLabel } });
      if (duplicate) {
        return NextResponse.json({ ok: true, operation: body.operation, created: false, data: duplicate });
      }

      const client = input.clientId?.trim()
        ? await prisma.invoiceClient.findUnique({ where: { id: input.clientId.trim() } })
        : await prisma.invoiceClient.findFirst({ where: { legalName: input.clientName!.trim() } });
      if (!client) {
        return NextResponse.json({ ok: false, error: "No se encontró el cliente indicado." }, { status: 400 });
      }

      const issuerProfile = await prisma.invoiceIssuerProfile.upsert({
        where: { code: "MLC-DEFAULT" },
        update: { isDefault: true },
        create: { code: "MLC-DEFAULT", legalName: "MARIANO LUJAN CANOVAS", invoicePrefix: "A", isDefault: true },
      });
      const template = await prisma.invoiceTemplate.upsert({
        where: { code: "MLC-CLASSIC" },
        update: { isDefault: true },
        create: { code: "MLC-CLASSIC", name: "MLC Clásica", layoutKey: "mlc-classic", isDefault: true },
      });
      const sourceLines = input.lines?.length ? input.lines : [{ description: serviceDescription }];
      const lines = sourceLines.map((line, sortOrder) => {
        const quantity = finiteNumber(line.quantity, 1) || 1;
        const unitPrice = finiteNumber(line.unitPrice);
        const discountAmount = finiteNumber(line.discountAmount);
        return {
          sortOrder,
          articleCode: clean(line.articleCode) || "H",
          description: clean(line.description) || serviceDescription,
          quantity,
          unitPrice,
          discountAmount,
          lineTotalAmount: quantity * unitPrice - discountAmount,
        };
      });
      const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotalAmount, 0);
      const vatRate = finiteNumber(input.vatRate);
      const irpfRate = finiteNumber(input.irpfRate);
      const vatAmount = subtotalAmount * vatRate / 100;
      const irpfAmount = subtotalAmount * irpfRate / 100;
      const totalAmount = subtotalAmount + vatAmount - irpfAmount;

      const invoice = await prisma.invoice.create({
        data: {
          issuerProfileId: issuerProfile.id,
          clientId: client.id,
          templateId: template.id,
          createdById: null,
          status: "DRAFT",
          documentName,
          series,
          numberLabel,
          number,
          issueDate,
          articleCode: lines[0]?.articleCode || "H",
          serviceDescription,
          notes: clean(input.notes),
          subtotalAmount,
          vatRate,
          vatAmount,
          irpfRate,
          irpfAmount,
          totalAmount,
          lines: { create: lines },
        },
        select: { id: true, documentName: true, series: true, numberLabel: true, issueDate: true, status: true, totalAmount: true },
      });
      return NextResponse.json({ ok: true, operation: body.operation, created: true, data: invoice }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  }
  return NextResponse.json({ ok: false, error: "Operación FORSETI no permitida." }, { status: 400 });
}
