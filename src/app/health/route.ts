import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/renta-fiscal/prisma";
import { ok } from "@/lib/renta-fiscal/api";

async function runtimeBuildId() {
  try {
    return (await readFile(join(process.cwd(), ".next", "BUILD_ID"), "utf8")).trim();
  } catch {
    return "unavailable";
  }
}

export async function GET() {
  const buildId = await runtimeBuildId();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", service: "forseti-renta-fiscal", database: "ok", buildId, timestamp: new Date().toISOString() });
  } catch (error) {
    return ok({
      status: "degraded",
      service: "forseti-renta-fiscal",
      database: "unavailable",
      message: "La aplicación está viva, pero la base de datos de Renta Fiscal no está disponible.",
      detail: error instanceof Error ? error.message : "Error desconocido",
      buildId,
      timestamp: new Date().toISOString(),
    });
  }
}
