import { NextResponse } from "next/server";
import { isForsetiAgentAuthorized } from "@/lib/agent-auth";
import { prisma } from "@/lib/renta-fiscal/prisma";

export async function POST(request: Request) {
  if (!isForsetiAgentAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Operador FORSETI no autorizado." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { operation?: string; limit?: number };
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 100);

  if (body.operation === "clients-list") {
    const data = await prisma.invoiceClient.findMany({
      select: { id: true, legalName: true, taxId: true, email: true, phone: true, updatedAt: true },
      orderBy: { legalName: "asc" }, take: limit,
    });
    return NextResponse.json({ ok: true, operation: body.operation, data });
  }
  if (body.operation === "invoices-list") {
    const data = await prisma.invoice.findMany({
      select: { id: true, documentName: true, series: true, numberLabel: true, issueDate: true, status: true, totalAmount: true, client: { select: { legalName: true } } },
      orderBy: { issueDate: "desc" }, take: limit,
    });
    return NextResponse.json({ ok: true, operation: body.operation, data });
  }
  if (body.operation === "services-list") {
    const data = await prisma.invoiceService.findMany({ select: { id: true, name: true, articleCode: true }, orderBy: { name: "asc" }, take: limit });
    return NextResponse.json({ ok: true, operation: body.operation, data });
  }
  return NextResponse.json({ ok: false, error: "Operación FORSETI no permitida." }, { status: 400 });
}
