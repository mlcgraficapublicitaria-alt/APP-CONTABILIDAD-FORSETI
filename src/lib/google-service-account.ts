import { createSign } from "crypto";
import { existsSync, readFileSync } from "fs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_FORSETI_OAUTH_CONFIG_PATH = "/data/.openclaw/workspace/forseti/integrations/google-drive/config.json";
const GOOGLE_AUTH_TIMEOUT_MS = 12_000;

type ServiceAccountCredentials = {
  email: string;
  privateKey: string;
};

type ForsetiOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tokenUri: string;
};

function parseServiceAccountValue(value: string): ServiceAccountCredentials | null {
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

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getFirstEnvValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value?.trim()) return value;
  }

  return "";
}

function timeoutSignal(ms: number) {
  return AbortSignal.timeout(ms);
}

function parseServiceAccountJson(): ServiceAccountCredentials | null {
  const rawJson = getFirstEnvValue([
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "GOOGLE_CREDENTIALS_JSON",
    "GOOGLE_CREDENTIALS",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
  ]);
  const rawBase64 = getFirstEnvValue(["GOOGLE_SERVICE_ACCOUNT_JSON_BASE64"]);
  const value = rawJson || (rawBase64 ? Buffer.from(rawBase64, "base64").toString("utf8") : "");

  if (!value) return null;

  return parseServiceAccountValue(value);
}

function parseServiceAccountFile(): ServiceAccountCredentials | null {
  const filePath = getFirstEnvValue([
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    "GOOGLE_CREDENTIALS_FILE",
  ]);

  if (!filePath || !existsSync(/* turbopackIgnore: true */ filePath)) return null;

  try {
    return parseServiceAccountValue(readFileSync(/* turbopackIgnore: true */ filePath, "utf8"));
  } catch {
    return null;
  }
}

function getGoogleCredentials(): ServiceAccountCredentials {
  const jsonCredentials = parseServiceAccountJson();
  if (jsonCredentials) return jsonCredentials;

  const fileCredentials = parseServiceAccountFile();
  if (fileCredentials) return fileCredentials;

  const email = getFirstEnvValue(["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_CLIENT_EMAIL"]);
  const rawKey = getFirstEnvValue(["GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GOOGLE_PRIVATE_KEY"]);
  const privateKey = rawKey?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "Faltan credenciales de Google en servidor. Configura GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (preferido), GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON, GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_CREDENTIALS_JSON, GOOGLE_CREDENTIALS, GOOGLE_APPLICATION_CREDENTIALS_JSON o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return { email, privateKey };
}

function getForsetiOAuthCredentials(): ForsetiOAuthCredentials | null {
  const clientId = getFirstEnvValue(["GOOGLE_OAUTH_CLIENT_ID", "FORSETI_GOOGLE_OAUTH_CLIENT_ID"]);
  const clientSecret = getFirstEnvValue(["GOOGLE_OAUTH_CLIENT_SECRET", "FORSETI_GOOGLE_OAUTH_CLIENT_SECRET"]);
  const refreshToken = getFirstEnvValue(["GOOGLE_OAUTH_REFRESH_TOKEN", "FORSETI_GOOGLE_OAUTH_REFRESH_TOKEN"]);
  const tokenUri =
    getFirstEnvValue(["GOOGLE_OAUTH_TOKEN_URI", "FORSETI_GOOGLE_OAUTH_TOKEN_URI"]) || TOKEN_URL;

  if (clientId && clientSecret && refreshToken) {
    return {
      clientId,
      clientSecret,
      refreshToken,
      tokenUri,
    };
  }

  const configPath = getFirstEnvValue(["FORSETI_OAUTH_CONFIG_PATH", "GOOGLE_OAUTH_CONFIG_PATH"]) || DEFAULT_FORSETI_OAUTH_CONFIG_PATH;
  if (!existsSync(/* turbopackIgnore: true */ configPath)) return null;

  try {
    const raw = readFileSync(/* turbopackIgnore: true */ configPath, "utf8");
    const parsed = JSON.parse(raw) as {
      auth?: { clientId?: string; clientSecret?: string; refreshToken?: string; tokenUri?: string };
    };
    const auth = parsed.auth;
    if (!auth?.clientId || !auth.clientSecret || !auth.refreshToken || !auth.tokenUri) return null;
    return {
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      refreshToken: auth.refreshToken,
      tokenUri: auth.tokenUri,
    };
  } catch {
    return null;
  }
}

export function hasGoogleServiceAccountCredentials() {
  try {
    getGoogleCredentials();
    return true;
  } catch {
    return Boolean(getForsetiOAuthCredentials());
  }
}

async function getServiceAccountAccessToken(scopes: string[]) {
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
    signal: timeoutSignal(GOOGLE_AUTH_TIMEOUT_MS),
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description ?? "No se pudo autenticar con Google.");
  return String(data.access_token);
}

async function getForsetiOAuthAccessToken() {
  const oauth = getForsetiOAuthCredentials();
  if (!oauth) {
    throw new Error(
      "Faltan credenciales Google: configura GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, GOOGLE_APPLICATION_CREDENTIALS, credenciales OAuth por variables de entorno, o FORSETI_OAUTH_CONFIG_PATH apuntando al config.json de la integracion Google Drive.",
    );
  }

  const response = await fetch(oauth.tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: timeoutSignal(GOOGLE_AUTH_TIMEOUT_MS),
    body: new URLSearchParams({
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      refresh_token: oauth.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description ?? data.error ?? "No se pudo autenticar con Google OAuth.");
  return String(data.access_token);
}

export async function getGoogleAccessToken(scopes: string[]) {
  try {
    return await getServiceAccountAccessToken(scopes);
  } catch (error) {
    if (parseServiceAccountJson() || parseServiceAccountFile()) {
      throw error;
    }

    return getForsetiOAuthAccessToken();
  }
}
