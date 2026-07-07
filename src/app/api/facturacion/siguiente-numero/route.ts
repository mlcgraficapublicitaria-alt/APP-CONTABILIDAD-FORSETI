import { prisma } from "@/lib/renta-fiscal/prisma";
import { ok, requireUser } from "@/lib/renta-fiscal/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasMysqlDatabaseUrl } from "@/lib/database-url";

const localInvoicesPath = path.join(process.cwd(), ".forseti", "invoices.json");

function getFallbackLastNumber(series: string) {
  const normalizedSeries = series.trim().toUpperCase();
  if (normalizedSeries === "P") return 133;
  return 432;
}

function formatInvoiceNumber(value: number) {
  return String(value).padStart(6, "0");
}

async function readLocalLastInvoiceNumber(series: string) {
  try {
    const content = await readFile(localInvoicesPath, "utf8");
    const invoices = JSON.parse(content) as Array<{ series?: string; number?: number }>;
    const fallbackLastNumber = getFallbackLastNumber(series);
    if (!Array.isArray(invoices)) return fallbackLastNumber;

    return invoices.reduce((max, invoice) => {
      if ((invoice.series || "A") !== series) return max;
      return typeof invoice.number === "number" && invoice.number > max ? invoice.number : max;
    }, fallbackLastNumber);
  } catch {
    return getFallbackLastNumber(series);
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
  const lastNumber = lastInvoice._max.number ?? getFallbackLastNumber(series);
  const nextNumber = lastNumber + 1;

  return ok({
    series,
    number: nextNumber,
    formattedNumber: formatInvoiceNumber(nextNumber),
  });
}
