const baseUrl = (process.env.FORSETI_API_BASE_URL || "").replace(/\/+$/, "");
const token = process.env.FORSETI_AGENT_TOKEN || "";
const operation = process.argv[2] || "";
const limit = Number(process.argv[3]) || 50;
if (!baseUrl || !token) {
  console.error(JSON.stringify({ ok: false, error: "Faltan FORSETI_API_BASE_URL o FORSETI_AGENT_TOKEN." }));
  process.exit(1);
}
const response = await fetch(`${baseUrl}/api/agent`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ operation, limit }) });
const text = await response.text();
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
catch { console.log(JSON.stringify({ ok: false, status: response.status, error: "Respuesta no JSON." })); }
if (!response.ok) process.exit(1);
