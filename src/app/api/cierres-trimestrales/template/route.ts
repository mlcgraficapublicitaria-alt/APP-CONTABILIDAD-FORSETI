import { NextResponse } from "next/server";
import { requireUser } from "@/lib/renta-fiscal/api";
import { templateRows } from "@/lib/cierre-trimestral/google-books";
import { makeWorkbook } from "@/lib/cierre-trimestral/xlsx";

function csv(values: string[][]) {
  return values.map((row) => row.map((value) => /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value).join(";")).join("\n");
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const url = new URL(request.url);
  const sheet = url.searchParams.get("sheet") === "RECIBIDAS" ? "RECIBIDAS" : "EXPEDIDAS";
  const template = templateRows();
  if (url.searchParams.get("format") === "xlsx") {
    const workbook = await makeWorkbook([
      { name: "EXPEDIDAS", rows: [[...template.headers], template.examples.EXPEDIDAS] },
      { name: "RECIBIDAS", rows: [[...template.headers], template.examples.RECIBIDAS] },
      { name: "INSTRUCCIONES", rows: [
        ["FORSETI - plantilla de libros trimestrales"],
        ["1", "Importa este archivo en Google Sheets sin cambiar los nombres EXPEDIDAS y RECIBIDAS."],
        ["2", "Sustituye las filas de ejemplo por las facturas reales, una factura por fila."],
        ["3", "No elimines ni renombres las columnas obligatorias."],
        ["4", "Comparte el Sheet únicamente con la cuenta de servicio de FORSETI. No lo publiques en Internet."],
      ] },
    ]);
    return new NextResponse(new Uint8Array(workbook), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": "attachment; filename=plantilla-libros-forseti.xlsx",
    } });
  }
  return new NextResponse(`\uFEFF${csv([[...template.headers], template.examples[sheet]])}`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="plantilla-${sheet.toLowerCase()}.csv"` },
  });
}
