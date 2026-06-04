import crypto from "node:crypto";

const PASSWORD_PREFIX = "pbkdf2_sha256";
const DEFAULT_AUTH_SECRET = "forseti-local-development-secret";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `${PASSWORD_PREFIX}$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, iterationsValue, salt, expectedHash] = storedHash.split("$");
  if (prefix !== PASSWORD_PREFIX || !iterationsValue || !salt || !expectedHash) return false;

  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations)) return false;

  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return safeCompare(actualHash, expectedHash);
}

export function signToken(payload: Record<string, unknown>, maxAgeSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = crypto.createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = crypto.createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");
  if (!safeCompare(signature, expected)) return null;

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { exp?: number; sub?: string; type?: string };
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function maskNif(value?: string | null) {
  if (!value) return null;
  const clean = value.replace(/\s/g, "");
  if (clean.length <= 3) return "***";
  return `${clean.slice(0, 2)}***${clean.slice(-1)}`;
}

export function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? DEFAULT_AUTH_SECRET;
}

function safeCompare(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
