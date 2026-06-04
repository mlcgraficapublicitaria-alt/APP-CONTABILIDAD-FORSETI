import { createHash } from "crypto";
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
          method: "GET",
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        const rawContent = response.ok ? await response.text() : "";
        const normalizedContent = normalizeOfficialPage(rawContent);
        const contentHash = normalizedContent ? createHash("sha256").update(normalizedContent).digest("hex") : "";
        const contentSize = normalizedContent.length;

        return {
          ...source,
          checkedAt,
          available: response.ok,
          statusText: response.ok ? "Fuente oficial disponible" : `La fuente respondio con estado ${response.status}`,
          contentHash,
          contentSize,
          refreshedSummary: response.ok
            ? `Fuente comprobada y contenido revisado. ${source.updateSummary}`
            : `No se pudo confirmar disponibilidad completa. Revisa manualmente: ${source.updateSummary}`,
        };
      } catch {
        return {
          ...source,
          checkedAt,
          available: false,
          statusText: "No se pudo comprobar ahora. Revisar manualmente el enlace oficial.",
          contentHash: "",
          contentSize: 0,
          refreshedSummary: `Comprobacion no completada. Revisa manualmente la fuente oficial: ${source.updateSummary}`,
        };
      }
    }),
  );

  return ok({
    checkedAt,
    sources,
    notice: "Fuentes oficiales revisadas. Si una huella cambia, FORSETI marcara posible actualizacion para revision manual.",
  });
}

function normalizeOfficialPage(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250000);
}
