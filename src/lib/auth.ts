import crypto from "node:crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "forseti_session";

const DEFAULT_LOGIN_USER = "admin";
const DEFAULT_LOGIN_PASSWORD = "forseti2026";

export const LOGIN_USERNAME = process.env.APP_LOGIN_USER ?? DEFAULT_LOGIN_USER;
const LOGIN_PASSWORD = process.env.APP_LOGIN_PASSWORD ?? DEFAULT_LOGIN_PASSWORD;
const SESSION_SECRET = process.env.APP_SESSION_SECRET ?? LOGIN_PASSWORD;

export function isValidLogin(username: string, password: string) {
  return secureCompare(username, LOGIN_USERNAME) && secureCompare(password, LOGIN_PASSWORD);
}

export async function hasValidSession() {
  const cookieStore = await cookies();
  return secureCompare(cookieStore.get(AUTH_COOKIE_NAME)?.value ?? "", createSessionToken());
}

export function createSessionToken() {
  return crypto.createHmac("sha256", SESSION_SECRET).update(`${LOGIN_USERNAME}:${LOGIN_PASSWORD}`).digest("hex");
}

function secureCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}
