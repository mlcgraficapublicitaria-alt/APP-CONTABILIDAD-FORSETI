import { NextResponse } from "next/server";
import { uploadFileToDrive } from "@/lib/drive-documents";
import { readExpenseFile, readExpenses } from "@/lib/expense-storage";
import { requireUser } from "@/lib/renta-fiscal/api";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = await request.json().catch(() => ({})) as { month?: string; folderId?: string };
  const month = body.month?.trim() || "";
  const folderId = body.folderId?.trim() || "";
  if (!/^\d{4}-\d{2}$/.test(month) || !folderId) return NextResponse.json({ error: "Selecciona un mes y una carpeta de Drive." }, { status: 400 });
  const expenses = (await readExpenses()).filter((item) => item.month === month);
  if (!expenses.length) return NextResponse.json({ error: "No hay gastos en ese mes." }, { status: 404 });

  const files = [];
  for (const expense of expenses) {
    files.push(await uploadFileToDrive({
      folderId,
      fileName: `${expense.expenseDate} - ${expense.supplier} - ${expense.fileName}`,
      mimeType: expense.mimeType,
      content: await readExpenseFile(expense.storedName),
    }));
  }
  return NextResponse.json({ uploaded: files.length, files });
}
