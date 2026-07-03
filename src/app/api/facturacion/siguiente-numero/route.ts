import { prisma } from "@/lib/renta-fiscal/prisma";
import { ok, requireUser } from "@/lib/renta-fiscal/api";

const FALLBACK_LAST_INVOICE_NUMBER = 430;

function formatInvoiceNumber(value: number) {
  return String(value).padStart(6, "0");
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const series = searchParams.get("serie")?.trim() || "A";
  const lastInvoice = await prisma.invoice.aggregate({
    where: { series },
    _max: { number: true },
  });
  const lastNumber = lastInvoice._max.number ?? FALLBACK_LAST_INVOICE_NUMBER;
  const nextNumber = lastNumber + 1;

  return ok({
    series,
    number: nextNumber,
    formattedNumber: formatInvoiceNumber(nextNumber),
  });
}
