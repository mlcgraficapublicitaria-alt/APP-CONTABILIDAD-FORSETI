import { NextResponse } from "next/server";
import { readExpenseFile, readExpenses } from "@/lib/expense-storage";
import { requireUser } from "@/lib/renta-fiscal/api";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const body = await request.json().catch(() => ({})) as { month?: string; email?: string };
  const month = body.month?.trim() || "";
  const email = body.email?.trim() || "";
  if (!/^\d{4}-\d{2}$/.test(month) || !email.includes("@")) return NextResponse.json({ error: "Mes o correo no válido." }, { status: 400 });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.APP_FROM_EMAIL ?? "Forseti <onboarding@resend.dev>";
  if (!apiKey) return NextResponse.json({ error: "Falta configurar RESEND_API_KEY en el hosting." }, { status: 503 });
  const expenses = (await readExpenses()).filter((item) => item.month === month);
  if (!expenses.length) return NextResponse.json({ error: "No hay gastos en ese mes." }, { status: 404 });
  const totalSize = expenses.reduce((sum, item) => sum + item.sizeBytes, 0);
  if (totalSize > 20 * 1024 * 1024) return NextResponse.json({ error: "Los adjuntos superan 20 MB. Descarga el ZIP y envíalo manualmente." }, { status: 400 });

  const attachments = await Promise.all(expenses.map(async (expense) => ({
    filename: expense.fileName,
    content: (await readExpenseFile(expense.storedName)).toString("base64"),
  })));
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: email,
      subject: `Gastos ${month} - FORSETI`,
      text: `Se adjuntan ${expenses.length} justificantes de gastos del mes ${month}.`,
      attachments,
    }),
  });
  if (!response.ok) return NextResponse.json({ error: "Resend no pudo enviar los justificantes." }, { status: 502 });
  return NextResponse.json({ sent: true, count: expenses.length });
}
