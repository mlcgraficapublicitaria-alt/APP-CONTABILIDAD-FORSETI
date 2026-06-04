import { prisma } from "@/lib/renta-fiscal/prisma";
import { ok } from "@/lib/renta-fiscal/api";

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  return ok({ status: "ok", service: "forseti-renta-fiscal", timestamp: new Date().toISOString() });
}
