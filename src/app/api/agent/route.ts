import { NextResponse } from "next/server";
import { isForsetiAgentAuthorized } from "@/lib/agent-auth";
import { compareHours } from "@/lib/forseti-hours-compare";
import { readMonthlyHoursPdfFromDrive } from "@/lib/forseti-hours-drive";
import { extractPdfDebugRows, extractPdfHours } from "@/lib/forseti-hours-pdf";
import { readSheetClientBillingInfo, readSheetClientTotalMinutes, readSheetMonthHours } from "@/lib/forseti-hours-sheet";
import type { AuditClient } from "@/lib/forseti-hours-types";
import { prisma } from "@/lib/renta-fiscal/prisma";

type ClientUpsertInput = {
  id?: string;
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

type ServiceUpsertInput = {
  id?: string;
  name?: string;
  articleCode?: string;
};

type DraftLineInput = {
  serviceId?: string;
  articleCode?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  notes?: string;
};

type InvoiceDraftInput = {
  id?: string;
  confirmation?: string;
  documentName?: string;
  series?: string;
  number?: string | number;
  issueDate?: string;
  clientId?: string;
  clientName?: string;
  serviceDescription?: string;
  notes?: string;
  issuerBankAccount?: string;
  vatRate?: number;
  irpfRate?: number;
  lines?: DraftLineInput[];
};

type AgentRequestBody = {
  operation?: string;
  limit?: number;
  month?: string;
  auditClient?: AuditClient;
  pdfBase64?: string;
  client?: ClientUpsertInput;
  service?: ServiceUpsertInput;
  invoice?: InvoiceDraftInput;
};

const AUDIT_CLIENTS = new Set<AuditClient>(["SPANISH-CHEESE", "GRUPO DIM", "MLCDESIGN"]);
const AUDIT_MONTH_PATTERN = /^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE) \d{4}$/;

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

function invoiceMetadata(value: string | null | undefined) {
  if (!value?.trim().startsWith("{")) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {} as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function invoiceDetailSelect() {
  return {
    id: true,
    documentName: true,
    series: true,
    numberLabel: true,
    issueDate: true,
    status: true,
    serviceDescription: true,
    notes: true,
    subtotalAmount: true,
    vatRate: true,
    vatAmount: true,
    irpfRate: true,
    irpfAmount: true,
    totalAmount: true,
    renderedHtml: true,
    client: { select: { id: true, legalName: true } },
    lines: {
      select: { id: true, sortOrder: true, articleCode: true, description: true, quantity: true, unitPrice: true, discountAmount: true, lineTotalAmount: true },
      orderBy: { sortOrder: "asc" as const },
    },
  };
}

function serializeInvoiceDetail(invoice: Awaited<ReturnType<typeof prisma.invoice.findUniqueOrThrow>>) {
  const metadata = invoiceMetadata((invoice as { renderedHtml?: string | null }).renderedHtml);
  const lineNotes = Array.isArray(metadata.lineNotes) ? metadata.lineNotes : [];
  const lineServiceIds = Array.isArray(metadata.lineServiceIds) ? metadata.lineServiceIds : [];
  const lines = (invoice as { lines?: Array<Record<string, unknown>> }).lines ?? [];
  const selectedClient = (invoice as { client?: { id?: string } }).client;
  return {
    ...invoice,
    issuerBankAccount: typeof metadata.issuerBankAccount === "string" ? metadata.issuerBankAccount : "",
    selectedClientId: typeof metadata.selectedClientId === "string" ? metadata.selectedClientId : selectedClient?.id,
    lines: lines.map((line, index) => ({
      ...line,
      serviceId: typeof lineServiceIds[index] === "string" ? lineServiceIds[index] : "",
      notes: typeof lineNotes[index] === "string" ? lineNotes[index] : "",
    })),
    renderedHtml: undefined,
  };
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
  if (body.operation === "invoice-detail") {
    const invoiceId = body.invoice?.id?.trim();
    if (!invoiceId) {
      return NextResponse.json({ ok: false, error: "La factura que quieres consultar no está identificada." }, { status: 400 });
    }
    try {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: invoiceDetailSelect() });
      if (!invoice) return NextResponse.json({ ok: false, error: "No se encontró la factura indicada." }, { status: 404 });
      return NextResponse.json({ ok: true, operation: body.operation, data: serializeInvoiceDetail(invoice as never) });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (body.operation === "bank-accounts-list") {
    try {
      const data = await prisma.invoiceBankAccount.findMany({ select: { id: true, value: true }, orderBy: { createdAt: "asc" }, take: limit });
      return NextResponse.json({ ok: true, operation: body.operation, data });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (body.operation === "services-list") {
    const data = await prisma.invoiceService.findMany({ select: { id: true, name: true, articleCode: true }, orderBy: { name: "asc" }, take: limit });
    return NextResponse.json({ ok: true, operation: body.operation, data });
  }
  if (body.operation === "service-upsert") {
    const input = body.service ?? {};
    const name = clean(input.name);
    const articleCode = clean(input.articleCode)?.toUpperCase();
    if (!name) {
      return NextResponse.json({ ok: false, error: "El nombre del servicio es obligatorio." }, { status: 400 });
    }
    if (!articleCode || !/^[A-Z0-9]{1,4}$/.test(articleCode)) {
      return NextResponse.json({ ok: false, error: "El código de artículo debe contener entre 1 y 4 letras o números." }, { status: 400 });
    }
    try {
      const requestedId = input.id?.trim();
      const existing = requestedId
        ? await prisma.invoiceService.findUnique({ where: { id: requestedId } })
        : await prisma.invoiceService.findFirst({ where: { name } });
      if (requestedId && !existing) {
        return NextResponse.json({ ok: false, error: "No se encontró el servicio que quieres actualizar." }, { status: 404 });
      }
      const service = existing
        ? await prisma.invoiceService.update({ where: { id: existing.id }, data: { name, articleCode } })
        : await prisma.invoiceService.create({ data: { name, articleCode } });
      const verified = await prisma.invoiceService.findUnique({ where: { id: service.id }, select: { id: true, name: true, articleCode: true, updatedAt: true } });
      if (!verified || verified.name !== name || verified.articleCode !== articleCode) {
        throw new Error("La verificación posterior del servicio no coincide con los datos solicitados.");
      }
      return NextResponse.json({ ok: true, operation: body.operation, created: !existing, data: verified }, { status: existing ? 200 : 201 });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (body.operation === "hours-audit-compare") {
    const month = body.month?.trim().toUpperCase() ?? "";
    const auditClient = body.auditClient;
    if (!AUDIT_MONTH_PATTERN.test(month)) {
      return NextResponse.json({ ok: false, error: "El mes debe usar el formato OCTUBRE 2026." }, { status: 400 });
    }
    if (!auditClient || !AUDIT_CLIENTS.has(auditClient)) {
      return NextResponse.json({ ok: false, error: "El cliente de la auditoría no es válido." }, { status: 400 });
    }

    try {
      const uploadedPdf = body.pdfBase64?.trim();
      const uploadedBuffer = uploadedPdf ? Uint8Array.from(Buffer.from(uploadedPdf, "base64")).buffer : null;
      const pdf = uploadedPdf
        ? { name: `${month.toLowerCase().replace(/\s+/g, "-")}.pdf`, buffer: uploadedBuffer as ArrayBuffer }
        : await readMonthlyHoursPdfFromDrive(month);
      if (pdf.buffer.byteLength === 0) {
        return NextResponse.json({ ok: false, error: "El PDF de horas está vacío." }, { status: 400 });
      }
      const [pdfDays, sheetDays, sheetClientTotalMinutes, pdfDebugRows] = await Promise.all([
        extractPdfHours(pdf.buffer, month),
        readSheetMonthHours(month),
        readSheetClientTotalMinutes(month, auditClient),
        extractPdfDebugRows(pdf.buffer, month),
      ]);
      if (pdfDays.length === 0) {
        return NextResponse.json({ ok: false, error: "No se pudieron extraer días o tramos del PDF mensual de horas." }, { status: 422 });
      }
      const pdfTotalMinutes = pdfDays.reduce((sum, day) => sum + day.totalMinutes, 0);
      const billingInfo = await readSheetClientBillingInfo(month, auditClient, pdfTotalMinutes);
      const data = compareHours(month, auditClient, pdfDays, sheetDays, sheetClientTotalMinutes, billingInfo, pdfDebugRows);
      return NextResponse.json({ ok: true, operation: body.operation, sourcePdf: pdf.name, readOnly: true, data });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (body.operation === "client-upsert") {
    const input = body.client ?? {};
    const legalName = clean(input.legalName);
    if (!legalName) {
      return NextResponse.json({ ok: false, error: "El nombre legal del cliente es obligatorio." }, { status: 400 });
    }

    try {
      const taxId = clean(input.taxId);
      const requestedId = input.id?.trim();
      const existing = requestedId
        ? await prisma.invoiceClient.findUnique({ where: { id: requestedId } })
        : taxId
          ? await prisma.invoiceClient.findFirst({ where: { OR: [{ taxId }, { legalName }] } })
          : await prisma.invoiceClient.findFirst({ where: { legalName } });
      if (requestedId && !existing) {
        return NextResponse.json({ ok: false, error: "No se encontró el cliente que quieres actualizar." }, { status: 404 });
      }
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
      const verified = await prisma.invoiceClient.findUnique({
        where: { id: client.id },
        select: { id: true, legalName: true, taxId: true, email: true, phone: true, updatedAt: true },
      });
      if (!verified || verified.legalName !== legalName || verified.taxId !== taxId) {
        throw new Error("La verificación posterior del cliente no coincide con los datos solicitados.");
      }
      return NextResponse.json({
        ok: true,
        operation: body.operation,
        created: !existing,
        data: verified,
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
    if (!input.clientId?.trim()) {
      return NextResponse.json({ ok: false, error: "FORSETI debe seleccionar el cliente mediante clientId desde clients-list." }, { status: 400 });
    }
    const sourceLines = input.lines?.length ? input.lines : [];
    if (!sourceLines.length || sourceLines.some((line) => !line.serviceId?.trim())) {
      return NextResponse.json({ ok: false, error: "FORSETI debe seleccionar cada servicio mediante serviceId desde services-list." }, { status: 400 });
    }

    try {
      const duplicate = await prisma.invoice.findFirst({ where: { series, numberLabel } });
      if (duplicate) {
        return NextResponse.json({ ok: true, operation: body.operation, created: false, data: duplicate });
      }

      const client = await prisma.invoiceClient.findUnique({ where: { id: input.clientId.trim() } });
      if (!client) {
        return NextResponse.json({ ok: false, error: "No se encontró el cliente indicado." }, { status: 400 });
      }
      const serviceIds = [...new Set(sourceLines.map((line) => line.serviceId!.trim()))];
      const services = await prisma.invoiceService.findMany({ where: { id: { in: serviceIds } } });
      if (services.length !== serviceIds.length) {
        return NextResponse.json({ ok: false, error: "Uno o más servicios seleccionados no existen en el catálogo de FORSETI." }, { status: 400 });
      }
      const servicesById = new Map(services.map((service) => [service.id, service]));

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
      const lines = sourceLines.map((line, sortOrder) => {
        const service = servicesById.get(line.serviceId!.trim())!;
        const quantity = finiteNumber(line.quantity, 1) || 1;
        const unitPrice = finiteNumber(line.unitPrice);
        const discountAmount = finiteNumber(line.discountAmount);
        return {
          sortOrder,
          serviceId: service.id,
          articleCode: service.articleCode,
          description: clean(line.description) || service.name,
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
          renderedHtml: JSON.stringify({
            selectedClientId: client.id,
            lineServiceIds: lines.map((line) => line.serviceId),
            lineNotes: sourceLines.map((line) => clean(line.notes) || ""),
          }),
          lines: {
            create: lines.map((line) => ({
              sortOrder: line.sortOrder,
              articleCode: line.articleCode,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              lineTotalAmount: line.lineTotalAmount,
            })),
          },
        },
        select: { id: true, documentName: true, series: true, numberLabel: true, issueDate: true, status: true, totalAmount: true },
      });
      return NextResponse.json({ ok: true, operation: body.operation, created: true, data: invoice }, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (body.operation === "invoice-issue") {
    const invoiceId = body.invoice?.id?.trim();
    const confirmation = body.invoice?.confirmation?.trim();
    if (!invoiceId) {
      return NextResponse.json({ ok: false, error: "La factura que quieres emitir no está identificada." }, { status: 400 });
    }
    if (confirmation !== "EMITIR") {
      return NextResponse.json({ ok: false, error: "La emisión requiere confirmation: \"EMITIR\"." }, { status: 400 });
    }

    try {
      const existing = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, documentName: true, series: true, numberLabel: true, issueDate: true, status: true, totalAmount: true },
      });
      if (!existing) {
        return NextResponse.json({ ok: false, error: "No se encontró la factura indicada." }, { status: 404 });
      }
      if (existing.status === "ISSUED") {
        return NextResponse.json({ ok: true, operation: body.operation, issued: false, alreadyIssued: true, data: existing });
      }
      if (existing.status !== "DRAFT") {
        return NextResponse.json({ ok: false, error: `La factura no puede emitirse desde el estado ${existing.status}.` }, { status: 409 });
      }

      const result = await prisma.invoice.updateMany({
        where: { id: invoiceId, status: "DRAFT" },
        data: { status: "ISSUED" },
      });
      if (result.count !== 1) {
        return NextResponse.json({ ok: false, error: "La factura cambió de estado durante la emisión; vuelve a consultarla." }, { status: 409 });
      }
      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        select: { id: true, documentName: true, series: true, numberLabel: true, issueDate: true, status: true, totalAmount: true },
      });
      return NextResponse.json({ ok: true, operation: body.operation, issued: true, alreadyIssued: false, data: invoice });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (body.operation === "invoice-update") {
    const input = body.invoice ?? {};
    const invoiceId = input.id?.trim();
    if (!invoiceId) {
      return NextResponse.json({ ok: false, error: "La factura que quieres editar no está identificada." }, { status: 400 });
    }
    if (input.confirmation?.trim() !== "EDITAR") {
      return NextResponse.json({ ok: false, error: "La edición requiere confirmation: \"EDITAR\"." }, { status: 400 });
    }
    if (!input.lines?.length) {
      return NextResponse.json({ ok: false, error: "La edición debe incluir al menos una línea de factura." }, { status: 400 });
    }
    if (!input.clientId?.trim()) {
      return NextResponse.json({ ok: false, error: "FORSETI debe seleccionar el cliente mediante clientId desde clients-list." }, { status: 400 });
    }
    if (input.lines.some((line) => !line.serviceId?.trim())) {
      return NextResponse.json({ ok: false, error: "FORSETI debe seleccionar cada servicio mediante serviceId desde services-list." }, { status: 400 });
    }
    const bankAccount = clean(input.issuerBankAccount);
    if (!bankAccount) {
      return NextResponse.json({ ok: false, error: "La edición debe indicar una cuenta bancaria guardada." }, { status: 400 });
    }

    try {
      const existing = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: invoiceDetailSelect() });
      if (!existing) return NextResponse.json({ ok: false, error: "No se encontró la factura indicada." }, { status: 404 });
      if (existing.status !== "ISSUED") {
        return NextResponse.json({ ok: false, error: `Solo se pueden editar facturas emitidas; estado actual: ${existing.status}.` }, { status: 409 });
      }
      const client = await prisma.invoiceClient.findUnique({ where: { id: input.clientId.trim() } });
      if (!client) {
        return NextResponse.json({ ok: false, error: "No se encontró el cliente seleccionado." }, { status: 400 });
      }
      const serviceIds = [...new Set(input.lines.map((line) => line.serviceId!.trim()))];
      const services = await prisma.invoiceService.findMany({ where: { id: { in: serviceIds } } });
      if (services.length !== serviceIds.length) {
        return NextResponse.json({ ok: false, error: "Uno o más servicios seleccionados no existen en el catálogo de FORSETI." }, { status: 400 });
      }
      const servicesById = new Map(services.map((service) => [service.id, service]));
      const savedBankAccount = await prisma.invoiceBankAccount.findFirst({ where: { value: bankAccount } });
      if (!savedBankAccount) {
        return NextResponse.json({ ok: false, error: "La cuenta bancaria indicada no está guardada en FORSETI." }, { status: 400 });
      }

      const serviceDescription = clean(input.serviceDescription) || input.lines.map((line) => clean(line.description)).filter(Boolean).join("\n");
      if (!serviceDescription) {
        return NextResponse.json({ ok: false, error: "La descripción del servicio es obligatoria." }, { status: 400 });
      }
      const lines = input.lines.map((line, sortOrder) => {
        const service = servicesById.get(line.serviceId!.trim())!;
        const description = clean(line.description) || service.name;
        if (!description) throw new Error(`La línea ${sortOrder + 1} no tiene descripción.`);
        const quantity = finiteNumber(line.quantity, 1) || 1;
        const unitPrice = finiteNumber(line.unitPrice);
        const discountAmount = finiteNumber(line.discountAmount);
        return {
          sortOrder,
          serviceId: service.id,
          articleCode: service.articleCode,
          description,
          quantity,
          unitPrice,
          discountAmount,
          lineTotalAmount: quantity * unitPrice - discountAmount,
          notes: clean(line.notes) || "",
        };
      });
      const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotalAmount, 0);
      const vatRate = Number(existing.vatRate);
      const irpfRate = Number(existing.irpfRate);
      const vatAmount = subtotalAmount * vatRate / 100;
      const irpfAmount = subtotalAmount * irpfRate / 100;
      const totalAmount = subtotalAmount + vatAmount - irpfAmount;
      const metadata = invoiceMetadata(existing.renderedHtml);
      const renderedHtml = JSON.stringify({
        ...metadata,
        selectedClientId: client.id,
        issuerBankAccount: bankAccount,
        lineServiceIds: lines.map((line) => line.serviceId),
        lineNotes: lines.map((line) => line.notes),
      });

      await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            documentName: clean(input.documentName) || existing.documentName,
            clientId: client.id,
            articleCode: lines[0]?.articleCode || existing.lines[0]?.articleCode || "H",
            serviceDescription,
            notes: clean(input.notes),
            subtotalAmount,
            vatAmount,
            irpfAmount,
            totalAmount,
            renderedHtml,
            lines: {
              deleteMany: {},
              create: lines.map((line) => ({
                sortOrder: line.sortOrder,
                articleCode: line.articleCode,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discountAmount: line.discountAmount,
                lineTotalAmount: line.lineTotalAmount,
              })),
            },
          },
        });
      });
      const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: invoiceDetailSelect() });
      return NextResponse.json({ ok: true, operation: body.operation, updated: true, data: serializeInvoiceDetail(invoice as never) });
    } catch (error) {
      return errorResponse(error);
    }
  }
  return NextResponse.json({ ok: false, error: "Operación FORSETI no permitida." }, { status: 400 });
}
