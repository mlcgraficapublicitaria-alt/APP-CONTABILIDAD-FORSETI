import { createSign } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function parseServiceAccountJson() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const rawBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  const value = rawJson ?? (rawBase64 ? Buffer.from(rawBase64, "base64").toString("utf8") : "");

  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as { client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      email: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

export function getGoogleCredentials() {
  const jsonCredentials = parseServiceAccountJson();
  if (jsonCredentials) return jsonCredentials;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? process.env.GOOGLE_PRIVATE_KEY;
  const privateKey = rawKey?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "Faltan credenciales de Google en servidor. Configura GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return { email, privateKey };
}

export function hasGoogleServiceAccountCredentials() {
  try {
    getGoogleCredentials();
    return true;
  } catch {
    return false;
  }
}

export async function getGoogleAccessToken(scopes: string[]) {
  const { email, privateKey } = getGoogleCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: email,
      scope: scopes.join(" "),
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description ?? "No se pudo autenticar con Google.");
  return String(data.access_token);
}
