import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasMysqlDatabaseUrl } from "@/lib/database-url";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";

type RegisterInvoiceBody = {
  id?: string;
  documentName?: string;
  series?: string;
  number?: string | number;
  issueDate?: string;
  clientName?: string;
  clientDetails?: string;
  articleCode?: string;
  serviceDescription?: string;
  subtotalAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  irpfRate?: number;
  irpfAmount?: number;
  totalAmount?: number;
  renderedHtml?: string;
};

type LocalInvoice = {
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
  renderedHtml?: string;
  createdAt: string;
};

const localInvoicesPath = path.join(process.cwd(), ".forseti", "invoices.json");

function parseInvoiceNumber(value: string | number | undefined) {
  const normalized = String(value ?? "").replace(/\D/g, "");
  const number = Number.parseInt(normalized, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function decimalNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido.";
}

async function readLocalInvoices() {
  try {
    const content = await readFile(localInvoicesPath, "utf8");
    const invoices = JSON.parse(content) as LocalInvoice[];
    return Array.isArray(invoices) ? invoices : [];
  } catch {
    return [];
  }
}

async function writeLocalInvoices(invoices: LocalInvoice[]) {
  await mkdir(path.dirname(localInvoicesPath), { recursive: true });
  await writeFile(localInvoicesPath, JSON.stringify(invoices, null, 2), "utf8");
}

async function getDefaultIssuerProfile() {
  return prisma.invoiceIssuerProfile.upsert({
    where: { code: "MLC-DEFAULT" },
    update: { isDefault: true },
    create: {
      code: "MLC-DEFAULT",
      legalName: "MARIANO LUJAN CANOVAS",
      taxId: "47078608-T",
      addressLine1: "C/ Dionisio Guardiola, 55",
      postalCode: "02003",
      city: "ALBACETE",
      email: "creativo@mlcdesign.es",
      phone: "639 350 843",
      website: "www.mlcdesign.es",
      bankAccount: "GLOBAL CAJA: ES15 3190 0091 1504 0253 9910",
      invoicePrefix: "A",
      isDefault: true,
    },
  });
}

async function getDefaultTemplate() {
  return prisma.invoiceTemplate.upsert({
    where: { code: "MLC-CLASSIC" },
    update: {
      name: "MLC Clasica",
      description: "Plantilla basada en la factura de ejemplo de Grupo Dim.",
      layoutKey: "mlc-classic",
      isDefault: true,
    },
    create: {
      code: "MLC-CLASSIC",
      name: "MLC Clasica",
      description: "Plantilla basada en la factura de ejemplo de Grupo Dim.",
      layoutKey: "mlc-classic",
      isDefault: true,
    },
  });
}

async function resolveInvoiceClient(clientName: string, clientDetails?: string) {
  const existingClient = await prisma.invoiceClient.findFirst({ where: { legalName: clientName } });
  return existingClient
    ? prisma.invoiceClient.update({
        where: { id: existingClient.id },
        data: { notes: clientDetails?.trim() || undefined },
      })
    : prisma.invoiceClient.create({
        data: {
          legalName: clientName,
          notes: clientDetails?.trim() || null,
        },
      });
}

function buildInvoiceData(body: RegisterInvoiceBody, documentName: string, series: string, number: number, issueDate: Date, serviceDescription: string) {
  return {
    documentName,
    series,
    number,
    issueDate,
    articleCode: body.articleCode?.trim() || null,
    serviceDescription,
    subtotalAmount: decimalNumber(body.subtotalAmount),
    vatRate: decimalNumber(body.vatRate),
    vatAmount: decimalNumber(body.vatAmount),
    irpfRate: decimalNumber(body.irpfRate),
    irpfAmount: decimalNumber(body.irpfAmount),
    totalAmount: decimalNumber(body.totalAmount),
    renderedHtml: body.renderedHtml?.trim() || null,
  };
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  if (!hasMysqlDatabaseUrl()) {
    const invoices = await readLocalInvoices();
    return ok({ invoices: invoices.sort((a, b) => b.issueDate.localeCompare(a.issueDate)) });
  }

  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: "ISSUED" },
      include: { issuerProfile: true, client: true },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      take: 100,
    });

    return ok({
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        documentName: invoice.documentName,
        series: invoice.series ?? "A",
        number: invoice.number,
        issueDate: invoice.issueDate.toISOString().slice(0, 10),
        clientName: invoice.client.legalName,
        clientDetails: invoice.client.notes ?? "",
        articleCode: invoice.articleCode ?? "H",
        serviceDescription: invoice.serviceDescription,
        subtotalAmount: Number(invoice.subtotalAmount),
        vatRate: Number(invoice.vatRate),
        vatAmount: Number(invoice.vatAmount),
        irpfRate: Number(invoice.irpfRate),
        irpfAmount: Number(invoice.irpfAmount),
        totalAmount: Number(invoice.totalAmount),
        issuer: {
          legalName: invoice.issuerProfile.legalName,
          taxId: invoice.issuerProfile.taxId ?? "",
          addressLine1: invoice.issuerProfile.addressLine1 ?? "",
          postalCode: invoice.issuerProfile.postalCode ?? "",
          city: invoice.issuerProfile.city ?? "",
          email: invoice.issuerProfile.email ?? "",
          phone: invoice.issuerProfile.phone ?? "",
          bankAccount: invoice.issuerProfile.bankAccount ?? "",
        },
      })),
    });
  } catch (error) {
    return badRequest(`No se pudieron cargar las facturas emitidas: ${errorMessage(error)}`);
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<RegisterInvoiceBody>(request);
  if (body.id?.trim()) return updateInvoice(body);

  return createInvoice(body, auth.user.id);
}

async function createInvoice(body: Partial<RegisterInvoiceBody>, userId: string) {
  const series = body.series?.trim() || "A";
  const number = parseInvoiceNumber(body.number);
  const clientName = body.clientName?.trim();
  const documentName = body.documentName?.trim();
  const serviceDescription = body.serviceDescription?.trim() || "Servicio";
  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();

  if (!number) return badRequest("El número de factura es obligatorio.");
  if (!clientName) return badRequest("El cliente de la factura es obligatorio.");
  if (!documentName) return badRequest("El nombre del documento es obligatorio.");
  if (Number.isNaN(issueDate.getTime())) return badRequest("La fecha de factura no es válida.");

  if (!hasMysqlDatabaseUrl()) {
    try {
      const invoices = await readLocalInvoices();
      const existing = invoices.find((invoice) => invoice.series === series && invoice.number === number);
      if (existing) return ok({ invoice: existing, existed: true });

      const invoice: LocalInvoice = {
        id: randomUUID(),
        documentName,
        series,
        number,
        issueDate: issueDate.toISOString(),
        clientName,
        clientDetails: body.clientDetails?.trim() || "",
        articleCode: body.articleCode?.trim() || "H",
        serviceDescription,
        subtotalAmount: decimalNumber(body.subtotalAmount),
        vatRate: decimalNumber(body.vatRate),
        vatAmount: decimalNumber(body.vatAmount),
        irpfRate: decimalNumber(body.irpfRate),
        irpfAmount: decimalNumber(body.irpfAmount),
        totalAmount: decimalNumber(body.totalAmount),
        renderedHtml: body.renderedHtml?.trim() || "",
        createdAt: new Date().toISOString(),
      };
      invoices.push(invoice);
      await writeLocalInvoices(invoices);
      return ok({ invoice, existed: false }, { status: 201 });
    } catch (error) {
      return badRequest(`No se pudo guardar la factura localmente: ${errorMessage(error)}`);
    }
  }

  try {
    const existing = await prisma.invoice.findUnique({
      where: { series_number: { series, number } },
    });
    if (existing) return ok({ invoice: existing, existed: true });

    const issuerProfile = await getDefaultIssuerProfile();
    const template = await getDefaultTemplate();
    const client = await resolveInvoiceClient(clientName, body.clientDetails);

    const invoice = await prisma.invoice.create({
      data: {
        issuerProfileId: issuerProfile.id,
        clientId: client.id,
        templateId: template.id,
        createdById: userId === "forseti-session-fallback" ? null : userId,
        status: "ISSUED",
        ...buildInvoiceData(body, documentName, series, number, issueDate, serviceDescription),
      },
    });

    return ok({ invoice, existed: false }, { status: 201 });
  } catch (error) {
    return badRequest(`No se pudo guardar la factura en MySQL: ${errorMessage(error)}`);
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<RegisterInvoiceBody>(request);
  return updateInvoice(body);
}

async function updateInvoice(body: Partial<RegisterInvoiceBody>) {
  const invoiceId = body.id?.trim();
  const series = body.series?.trim() || "A";
  const number = parseInvoiceNumber(body.number);
  const clientName = body.clientName?.trim();
  const documentName = body.documentName?.trim();
  const serviceDescription = body.serviceDescription?.trim() || "Servicio";
  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();

  if (!invoiceId) return badRequest("La factura que quieres editar no esta identificada.");
  if (!number) return badRequest("El numero de factura es obligatorio.");
  if (!clientName) return badRequest("El cliente de la factura es obligatorio.");
  if (!documentName) return badRequest("El nombre del documento es obligatorio.");
  if (Number.isNaN(issueDate.getTime())) return badRequest("La fecha de factura no es valida.");

  if (!hasMysqlDatabaseUrl()) {
    try {
      const invoices = await readLocalInvoices();
      const invoiceIndex = invoices.findIndex((invoice) => invoice.id === invoiceId);
      if (invoiceIndex < 0) return badRequest("No se encontro la factura emitida para editar.");

      const duplicate = invoices.find((invoice) => invoice.id !== invoiceId && invoice.series === series && invoice.number === number);
      if (duplicate) return badRequest(`Ya existe la factura ${series}/${String(number).padStart(6, "0")}.`);

      const invoice: LocalInvoice = {
        ...invoices[invoiceIndex],
        documentName,
        series,
        number,
        issueDate: issueDate.toISOString(),
        clientName,
        clientDetails: body.clientDetails?.trim() || "",
        articleCode: body.articleCode?.trim() || "H",
        serviceDescription,
        subtotalAmount: decimalNumber(body.subtotalAmount),
        vatRate: decimalNumber(body.vatRate),
        vatAmount: decimalNumber(body.vatAmount),
        irpfRate: decimalNumber(body.irpfRate),
        irpfAmount: decimalNumber(body.irpfAmount),
        totalAmount: decimalNumber(body.totalAmount),
        renderedHtml: body.renderedHtml?.trim() || "",
      };

      invoices[invoiceIndex] = invoice;
      await writeLocalInvoices(invoices);
      return ok({ invoice, updated: true });
    } catch (error) {
      return badRequest(`No se pudo actualizar la factura localmente: ${errorMessage(error)}`);
    }
  }

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return badRequest("No se encontro la factura emitida para editar.");

    const duplicate = await prisma.invoice.findFirst({
      where: {
        series,
        number,
        NOT: { id: invoiceId },
      },
    });
    if (duplicate) return badRequest(`Ya existe la factura ${series}/${String(number).padStart(6, "0")}.`);

    const client = await resolveInvoiceClient(clientName, body.clientDetails);
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        clientId: client.id,
        status: "ISSUED",
        ...buildInvoiceData(body, documentName, series, number, issueDate, serviceDescription),
      },
    });

    return ok({ invoice: updatedInvoice, updated: true });
  } catch (error) {
    return badRequest(`No se pudo actualizar la factura en MySQL: ${errorMessage(error)}`);
  }
}
