import { randomUUID } from "node:crypto";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/renta-fiscal/api";
import { readExpenses, saveExpenseFile, writeExpenses, type StoredExpense } from "@/lib/expense-storage";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 10 * 1024 * 1024;

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const expenses = await readExpenses();
  return NextResponse.json({ expenses: expenses.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  const expenseDate = String(formData.get("expenseDate") || "").trim();
  const supplier = String(formData.get("supplier") || "").trim();
  const invoiceNumber = String(formData.get("invoiceNumber") || "").trim();
  const concept = String(formData.get("concept") || "").trim();
  const category = String(formData.get("category") || "Otros").trim();
  const notes = String(formData.get("notes") || "").trim();
  const amount = Number(String(formData.get("amount") || "0").replace(",", "."));

  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Adjunta la factura o justificante." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Solo se admiten PDF, JPG, PNG o WEBP." }, { status: 400 });
  if (file.size > maxFileSize) return NextResponse.json({ error: "El archivo no puede superar 10 MB." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return NextResponse.json({ error: "La fecha del gasto no es válida." }, { status: 400 });
  if (!supplier || !concept) return NextResponse.json({ error: "Proveedor y concepto son obligatorios." }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "El importe no es válido." }, { status: 400 });

  const id = randomUUID();
  const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  const storedName = `${id}${extension}`;
  const expense: StoredExpense = {
    id,
    expenseDate,
    month: expenseDate.slice(0, 7),
    supplier,
    invoiceNumber,
    concept,
    category,
    amount,
    notes,
    fileName: file.name,
    storedName,
    mimeType: file.type,
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };

  await saveExpenseFile(storedName, Buffer.from(await file.arrayBuffer()));
  const expenses = await readExpenses();
  expenses.push(expense);
  await writeExpenses(expenses);
  return NextResponse.json({ expense }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Gasto no identificado." }, { status: 400 });

  const expenses = await readExpenses();
  const expense = expenses.find((item) => item.id === id);
  if (!expense) return NextResponse.json({ error: "No se encontró el gasto." }, { status: 404 });
  await writeExpenses(expenses.filter((item) => item.id !== id));
  await unlink(path.join(process.cwd(), ".forseti", "gastos", "archivos", path.basename(expense.storedName))).catch(() => undefined);
  return NextResponse.json({ deleted: true });
}
