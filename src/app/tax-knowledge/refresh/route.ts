import { ok, requireUser } from "@/lib/renta-fiscal/api";
import { TAX_KNOWLEDGE_SOURCES } from "@/lib/renta-fiscal/tax-knowledge";

export async function POST() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const checkedAt = new Date().toISOString();
  const sources = await Promise.all(
    TAX_KNOWLEDGE_SOURCES.map(async (source) => {
      try {
        const response = await fetch(source.url, {
          method: "HEAD",
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });

        return {
          ...source,
          checkedAt,
          available: response.ok,
          statusText: response.ok ? "Fuente oficial disponible" : `La fuente respondio con estado ${response.status}`,
        };
      } catch {
        return {
          ...source,
          checkedAt,
          available: false,
          statusText: "No se pudo comprobar ahora. Revisar manualmente el enlace oficial.",
        };
      }
    }),
  );

  return ok({
    checkedAt,
    sources,
    notice:
      "La comprobacion solo verifica fuentes oficiales disponibles. No usa IA ni consume tokens. Las deducciones aplicables deben revisarse segun ejercicio, comunidad autonoma y situacion personal.",
  });
}
