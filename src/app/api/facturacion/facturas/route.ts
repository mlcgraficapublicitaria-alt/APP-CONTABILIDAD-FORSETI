import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";

type RegisterInvoiceBody = {
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
  createdAt: string;
};

const localInvoicesPath = path.join(process.cwd(), ".forseti", "invoices.json");

function hasMysqlDatabaseUrl() {
  return (process.env.DATABASE_URL ?? "").startsWith("mysql://");
}

function parseInvoiceNumber(value: string | number | undefined) {
  const normalized = String(value ?? "").replace(/\D/g, "");
  const number = Number.parseInt(normalized, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function decimalNumber(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
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
  const existing = await prisma.invoiceIssuerProfile.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.invoiceIssuerProfile.create({
    data: {
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

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<RegisterInvoiceBody>(request);
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
      createdAt: new Date().toISOString(),
    };
    invoices.push(invoice);
    await writeLocalInvoices(invoices);
    return ok({ invoice, existed: false }, { status: 201 });
  }

  const existing = await prisma.invoice.findUnique({
    where: { series_number: { series, number } },
  });
  if (existing) return ok({ invoice: existing, existed: true });

  const issuerProfile = await getDefaultIssuerProfile();
  const template = await getDefaultTemplate();
  const existingClient = await prisma.invoiceClient.findFirst({ where: { legalName: clientName } });
  const client = existingClient
    ? await prisma.invoiceClient.update({
        where: { id: existingClient.id },
        data: { notes: body.clientDetails?.trim() || undefined },
      })
    : await prisma.invoiceClient.create({
        data: {
          legalName: clientName,
          notes: body.clientDetails?.trim() || null,
        },
      });

  const invoice = await prisma.invoice.create({
    data: {
      issuerProfileId: issuerProfile.id,
      clientId: client.id,
      templateId: template.id,
      createdById: auth.user.id === "forseti-session-fallback" ? null : auth.user.id,
      status: "ISSUED",
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
    },
  });

  return ok({ invoice, existed: false }, { status: 201 });
}
