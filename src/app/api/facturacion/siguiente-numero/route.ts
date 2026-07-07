import { prisma } from "@/lib/renta-fiscal/prisma";
import { ok, requireUser } from "@/lib/renta-fiscal/api";
import { readFile } from "node:fs/promises";
import path from "node:path";

const FALLBACK_LAST_INVOICE_NUMBER = 430;
const localInvoicesPath = path.join(process.cwd(), ".forseti", "invoices.json");

function formatInvoiceNumber(value: number) {
  return String(value).padStart(6, "0");
}

function hasMysqlDatabaseUrl() {
  return (process.env.DATABASE_URL ?? "").startsWith("mysql://");
}

async function readLocalLastInvoiceNumber(series: string) {
  try {
    const content = await readFile(localInvoicesPath, "utf8");
    const invoices = JSON.parse(content) as Array<{ series?: string; number?: number }>;
    if (!Array.isArray(invoices)) return FALLBACK_LAST_INVOICE_NUMBER;

    return invoices.reduce((max, invoice) => {
      if ((invoice.series || "A") !== series) return max;
      return typeof invoice.number === "number" && invoice.number > max ? invoice.number : max;
    }, FALLBACK_LAST_INVOICE_NUMBER);
  } catch {
    return FALLBACK_LAST_INVOICE_NUMBER;
  }
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const series = searchParams.get("serie")?.trim() || "A";
  if (!hasMysqlDatabaseUrl()) {
    const lastNumber = await readLocalLastInvoiceNumber(series);
    const nextNumber = lastNumber + 1;

    return ok({
      series,
      number: nextNumber,
      formattedNumber: formatInvoiceNumber(nextNumber),
    });
  }

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
