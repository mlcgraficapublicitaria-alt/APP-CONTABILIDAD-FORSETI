import { NextResponse } from "next/server";
import { readExpenseFile, readExpenses, safeDownloadName } from "@/lib/expense-storage";
import { requireUser } from "@/lib/renta-fiscal/api";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  const searchParams = new URL(request.url).searchParams;
  const id = searchParams.get("id")?.trim();
  const preview = searchParams.get("modo") === "preview";
  const expense = (await readExpenses()).find((item) => item.id === id);
  if (!expense) return NextResponse.json({ error: "No se encontró el justificante." }, { status: 404 });
  const content = await readExpenseFile(expense.storedName);
  return new Response(content, {
    headers: {
      "Content-Type": expense.mimeType,
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(safeDownloadName(expense.fileName))}`,
      "Content-Length": String(content.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
