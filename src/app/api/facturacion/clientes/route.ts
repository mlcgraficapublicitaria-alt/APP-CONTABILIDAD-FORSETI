import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/renta-fiscal/prisma";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";

type SaveInvoiceClientBody = {
  id?: string;
  legalName?: string;
  details?: string;
};

type InvoiceClientRecord = {
  id: string;
  legalName: string;
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

const localClientsPath = path.join(process.cwd(), ".forseti", "invoice-clients.json");

function hasMysqlDatabaseUrl() {
  return (process.env.DATABASE_URL ?? "").startsWith("mysql://");
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function productionDatabaseError() {
  return "En producción las fichas de cliente necesitan una base de datos MySQL persistente. Configura DATABASE_URL y ejecuta las migraciones de Prisma.";
}

function serializeInvoiceClient(client: InvoiceClientRecord) {
  return {
    id: client.id,
    legalName: client.legalName,
    taxId: client.taxId ?? "",
    addressLine1: client.addressLine1 ?? "",
    addressLine2: client.addressLine2 ?? "",
    postalCode: client.postalCode ?? "",
    city: client.city ?? "",
    province: client.province ?? "",
    country: client.country ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    details: client.notes ?? "",
  };
}

async function readLocalClients() {
  try {
    const content = await readFile(localClientsPath, "utf8");
    const clients = JSON.parse(content) as InvoiceClientRecord[];
    return Array.isArray(clients) ? clients : [];
  } catch {
    return [];
  }
}

async function writeLocalClients(clients: InvoiceClientRecord[]) {
  await mkdir(path.dirname(localClientsPath), { recursive: true });
  await writeFile(localClientsPath, JSON.stringify(clients, null, 2), "utf8");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  if (!hasMysqlDatabaseUrl()) {
    if (isProduction()) return ok({ clients: [], error: productionDatabaseError() }, { status: 503 });

    const clients = await readLocalClients();
    clients.sort((a, b) => a.legalName.localeCompare(b.legalName, "es"));
    return ok({ clients: clients.map(serializeInvoiceClient) });
  }

  try {
    const clients = await prisma.invoiceClient.findMany({
      orderBy: { legalName: "asc" },
    });

    return ok({ clients: clients.map(serializeInvoiceClient) });
  } catch (error) {
    return ok(
      {
        clients: [],
        error: error instanceof Error ? `No se pudieron cargar las fichas desde MySQL: ${error.message}` : "No se pudieron cargar las fichas desde MySQL.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<SaveInvoiceClientBody>(request);
  const legalName = body.legalName?.trim();
  if (!legalName) return badRequest("El nombre del cliente es obligatorio.");

  const details = body.details?.trim() || null;

  if (!hasMysqlDatabaseUrl()) {
    if (isProduction()) return badRequest(productionDatabaseError());

    const clients = await readLocalClients();
    const existingIndex = body.id
      ? clients.findIndex((client) => client.id === body.id)
      : clients.findIndex((client) => client.legalName.toLowerCase() === legalName.toLowerCase());

    const client =
      existingIndex >= 0
        ? {
            ...clients[existingIndex],
            legalName,
            notes: details,
          }
        : {
            id: randomUUID(),
            legalName,
            taxId: null,
            addressLine1: null,
            addressLine2: null,
            postalCode: null,
            city: null,
            province: null,
            country: null,
            email: null,
            phone: null,
            notes: details,
          };

    if (existingIndex >= 0) {
      clients[existingIndex] = client;
    } else {
      clients.push(client);
    }

    await writeLocalClients(clients);
    return ok({ client: serializeInvoiceClient(client) }, { status: existingIndex >= 0 ? 200 : 201 });
  }

  try {
    const existing = body.id
      ? await prisma.invoiceClient.findUnique({ where: { id: body.id } })
      : await prisma.invoiceClient.findFirst({ where: { legalName } });

    const client = existing
      ? await prisma.invoiceClient.update({
          where: { id: existing.id },
          data: { legalName, notes: details },
        })
      : await prisma.invoiceClient.create({
          data: { legalName, notes: details },
        });

    return ok({ client: serializeInvoiceClient(client) }, { status: existing ? 200 : 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? `No se pudo guardar la ficha en MySQL: ${error.message}` : "No se pudo guardar la ficha en MySQL.");
  }
}
