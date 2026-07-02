import { prisma } from "@/lib/renta-fiscal/prisma";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";

type SaveInvoiceClientBody = {
  id?: string;
  legalName?: string;
  details?: string;
};

function serializeInvoiceClient(client: {
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
}) {
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

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const clients = await prisma.invoiceClient.findMany({
    orderBy: { legalName: "asc" },
  });

  return ok({ clients: clients.map(serializeInvoiceClient) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<SaveInvoiceClientBody>(request);
  const legalName = body.legalName?.trim();
  if (!legalName) return badRequest("El nombre del cliente es obligatorio.");

  const details = body.details?.trim() || null;
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
}
