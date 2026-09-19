import { NextResponse } from "next/server";
import { requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";
import { makeWorkbook } from "@/lib/cierre-trimestral/xlsx";
import { getQuarterSummary } from "@/lib/cierre-trimestral/service";

const HEADERS = ["Número factura", "Fecha expedición", "NIF tercero", "Nombre tercero", "Concepto", "Tipo factura", "Clase operación", "Base imponible", "Tipo IVA", "Cuota IVA", "Cuota deducible", "Total factura"];

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const closureId = new URL(request.url).searchParams.get("closureId")?.trim();
  if (!closureId) return NextResponse.json({ error: "Cierre no identificado." }, { status: 400 });
  const closure = await prisma.quarterlyClosure.findFirst({
    where: { id: closureId, taxCase: { ownerId: auth.user.id } },
    include: { ledgerEntries: { include: { importRow: true }, orderBy: { operationDate: "asc" } } },
  });
  if (!closure) return NextResponse.json({ error: "Cierre no encontrado." }, { status: 404 });
  const rowsFor = (direction: "SALE" | "PURCHASE") => closure.ledgerEntries.filter((entry) => entry.direction === direction).map((entry) => {
    const original = (entry.importRow?.originalJson ?? {}) as Record<string, unknown>;
    return [
      String(original.numero_factura ?? entry.anonymousEntryId), entry.operationDate.toISOString().slice(0, 10),
      String(original.nif_tercero ?? ""), String(original.nombre_tercero ?? ""), String(original.concepto ?? ""),
      entry.documentType, entry.taxKind, Number(entry.baseCents) / 100, (entry.vatRateBasisPoints ?? 0) / 100,
      Number(entry.vatCents) / 100, direction === "PURCHASE" && entry.includedIn303 ? Number(entry.vatCents) / 100 : 0, Number(entry.totalCents) / 100,
    ];
  });
  const summary = await getQuarterSummary(closureId, auth.user.id);
  const workbook = await makeWorkbook([
    { name: "EXPEDIDAS", rows: [HEADERS, ...rowsFor("SALE")] },
    { name: "RECIBIDAS", rows: [HEADERS, ...rowsFor("PURCHASE")] },
    { name: "RESUMEN", rows: [
      ["FORSETI - borrador de libros y casillas"], ["Ejercicio", closure.fiscalYear], ["Trimestre", closure.quarter],
      ["Base ventas", summary.totals.salesBaseCents / 100], ["Base compras", summary.totals.purchasesBaseCents / 100],
      ["IVA repercutido", summary.totals.outputVatCents / 100], ["IVA soportado", summary.totals.inputVatCents / 100],
      ["Resultado 303", summary.totals.result303Cents / 100], ["Resultado 130 provisional", summary.totals.provisional130Cents / 100],
      ["CONTROL", "Revisar con el validador de libros de la AEAT antes de presentar."],
    ] },
  ]);
  return new NextResponse(new Uint8Array(workbook), { headers: {
    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition": `attachment; filename="libros-${closure.fiscalYear}-${closure.quarter}T-forseti.xlsx"`,
  } });
}
