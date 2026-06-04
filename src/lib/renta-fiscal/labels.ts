export function formatCaseStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Borrador",
    IN_REVIEW: "En revision",
    READY: "Listo para revision",
    CLOSED: "Cerrado",
  };
  return labels[status] ?? status;
}

export function formatConfidence(status: string) {
  const labels: Record<string, string> = {
    CONFIRMED: "Confirmado",
    ESTIMATED: "Estimado",
    PENDING: "Pendiente",
  };
  return labels[status] ?? status;
}

export function formatDocumentStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    RECEIVED: "Recibido",
    REVIEWED: "Revisado",
    REJECTED: "Rechazado",
  };
  return labels[status] ?? status;
}

export function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    create: "Creacion",
    update: "Actualizacion",
    upsert: "Alta o actualizacion",
    upload_stub: "Registro documental",
    validate: "Validacion",
    analyze_model_303: "Analisis del modelo 303",
    analyze_model_130: "Analisis del modelo 130",
    seed: "Carga inicial",
    login: "Inicio de sesion",
  };
  return labels[action] ?? action;
}

export function formatAuditEntity(entity: string) {
  const labels: Record<string, string> = {
    TaxCase: "Expediente fiscal",
    Document: "Documento",
    DataPoint: "Dato clave",
    User: "Usuario",
  };
  return labels[entity] ?? entity;
}

export function formatAuditMetadata(metadata?: string | null) {
  if (!metadata) return "Sin detalles adicionales";

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    if (parsed.scope === "renta-fiscal-mvp") return "Carga inicial del modulo de renta fiscal";
    if (parsed.scope === "renta-fiscal") return "Operacion del modulo de renta fiscal";

    const entries = Object.entries(parsed)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `${formatMetadataKey(key)}: ${String(value)}`);

    return entries.length > 0 ? entries.join(" · ") : "Sin detalles adicionales";
  } catch {
    return metadata;
  }
}

export function formatUserRole(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    ADVISOR: "Asesor",
    VIEWER: "Solo lectura",
  };
  return labels[role] ?? role;
}

function formatMetadataKey(key: string) {
  const labels: Record<string, string> = {
    scope: "Ambito",
  };
  return labels[key] ?? key;
}
