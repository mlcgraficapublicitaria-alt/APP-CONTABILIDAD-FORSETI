import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionToken, isValidLogin } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 8;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json");
  const body = wantsJson ? await request.json().catch(() => null) : null;
  const formData = wantsJson ? null : await request.formData().catch(() => null);
  const usernameValue = wantsJson ? body?.username : formData?.get("username");
  const passwordValue = wantsJson ? body?.password : formData?.get("password");
  const username = typeof usernameValue === "string" ? usernameValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!isValidLogin(username, password)) {
    if (!wantsJson) {
      return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
    }

    return NextResponse.json({ message: "Usuario o contrasena incorrectos." }, { status: 401 });
  }

  const response = wantsJson ? NextResponse.json({ ok: true }) : NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
