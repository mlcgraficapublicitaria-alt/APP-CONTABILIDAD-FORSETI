export function cleanDatabaseUrl(value = process.env.DATABASE_URL) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";

  const first = trimmed.at(0);
  const last = trimmed.at(-1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function getDatabaseUrl() {
  return cleanDatabaseUrl() || "file:./dev.db";
}

export function hasMysqlDatabaseUrl() {
  return cleanDatabaseUrl().startsWith("mysql://");
}
