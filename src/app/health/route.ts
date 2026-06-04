import { prisma } from "@/lib/renta-fiscal/prisma";
import { ok } from "@/lib/renta-fiscal/api";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", service: "forseti-renta-fiscal", database: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    return ok({
      status: "degraded",
      service: "forseti-renta-fiscal",
      database: "unavailable",
      message: "La aplicacion esta viva, pero la base de datos de Renta Fiscal no esta disponible.",
      detail: error instanceof Error ? error.message : "Error desconocido",
      timestamp: new Date().toISOString(),
    });
  }
}
