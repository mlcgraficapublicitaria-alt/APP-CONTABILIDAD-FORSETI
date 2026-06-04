import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasValidSession } from "@/lib/auth";
import { prisma } from "./prisma";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./security";

export const ACCESS_COOKIE = "forseti_rf_access";
export const REFRESH_COOKIE = "forseti_rf_refresh";
export const ACCESS_MAX_AGE = 60 * 15;
export const REFRESH_MAX_AGE = 60 * 60 * 8;

export type RentaFiscalUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}

export function issueTokens(user: RentaFiscalUser) {
  return {
    accessToken: signToken({ sub: user.id, type: "access" }, ACCESS_MAX_AGE),
    refreshToken: signToken({ sub: user.id, type: "refresh" }, REFRESH_MAX_AGE),
  };
}

export function setAuthCookies(response: NextResponse, tokens: { accessToken: string; refreshToken: string }) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const payload = accessToken ? verifyToken(accessToken) : null;
  if (!payload?.sub) {
    if (await hasValidSession()) return getForsetiSessionUser();
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user ? toPublicUser(user) : null;
}

export async function refreshCurrentUser() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const payload = refreshToken ? verifyToken(refreshToken) : null;
  if (!payload?.sub || payload.type !== "refresh") return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user ? toPublicUser(user) : null;
}

function toPublicUser(user: { id: string; email: string; name: string; role: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

async function getForsetiSessionUser() {
  const email = process.env.FORSETI_RENTA_SESSION_USER_EMAIL ?? "forseti-session@forseti.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Sesion principal FORSETI",
      role: "ADMIN",
      passwordHash: hashPassword(cryptoSafeFallbackPassword()),
    },
  });
  return toPublicUser(user);
}

function cryptoSafeFallbackPassword() {
  return `${Date.now()}-${Math.random()}-${process.pid}`;
}
