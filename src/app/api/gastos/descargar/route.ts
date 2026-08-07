import JSZip from "jszip";
import { NextResponse } from "next/server";
import { readExpenseFile, readExpenses, safeDownloadName } from "@/lib/expense-storage";
import { requireUser } from "@/lib/renta-fiscal/api";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const month = new URL(request.url).searchParams.get("mes")?.trim() || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Selecciona un mes válido." }, { status: 400 });
  const expenses = (await readExpenses()).filter((item) => item.month === month);
  if (!expenses.length) return NextResponse.json({ error: "No hay gastos en ese mes." }, { status: 404 });

  const zip = new JSZip();
  for (const [index, expense] of expenses.entries()) {
    const name = `${String(index + 1).padStart(2, "0")}-${expense.expenseDate}-${expense.supplier}-${safeDownloadName(expense.fileName)}`;
    zip.file(safeDownloadName(name), await readExpenseFile(expense.storedName));
  }
  zip.file("resumen.csv", ["Fecha;Proveedor;Numero factura o ticket;Concepto;Categoria;Importe", ...expenses.map((item) => `${item.expenseDate};${item.supplier};${item.invoiceNumber || ""};${item.concept};${item.category};${item.amount.toFixed(2)}`)].join("\n"));
  const content = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const archive = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="gastos-${month}.zip"`,
    },
  });
}
