import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionToken, isValidLogin } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 8;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isValidLogin(username, password)) {
    return NextResponse.json({ message: "Usuario o contrasena incorrectos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
