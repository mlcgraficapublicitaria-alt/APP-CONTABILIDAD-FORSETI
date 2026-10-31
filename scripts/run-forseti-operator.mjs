import { readFileSync } from "node:fs";

const envFile = process.env.FORSETI_OPERATOR_ENV_FILE || "/data/.openclaw/secrets/forseti/operator.env";
if (!process.env.FORSETI_API_BASE_URL || !process.env.FORSETI_AGENT_TOKEN) {
  try {
    for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // The existing validation below reports missing configuration without exposing secrets.
  }
}

const baseUrl = (process.env.FORSETI_API_BASE_URL || "").replace(/\/+$/, "");
const token = process.env.FORSETI_AGENT_TOKEN || "";
const operation = process.argv[2] || "";
const argument = process.argv[3] || "";
let payload = {};
if (argument.trim().startsWith("{")) {
  try { payload = JSON.parse(argument); }
  catch {
    console.error(JSON.stringify({ ok: false, error: "El payload JSON no es válido." }));
    process.exit(1);
  }
} else {
  payload = { limit: Number(argument) || 50 };
}
if (!baseUrl || !token) {
  console.error(JSON.stringify({ ok: false, error: "Faltan FORSETI_API_BASE_URL o FORSETI_AGENT_TOKEN." }));
  process.exit(1);
}
const response = await fetch(`${baseUrl}/api/agent`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ ...payload, operation }) });
const text = await response.text();
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
catch { console.log(JSON.stringify({ ok: false, status: response.status, error: "Respuesta no JSON." })); }
if (!response.ok) process.exit(1);
