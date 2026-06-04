import { NextResponse } from "next/server";
import { getDefaultMonthLabel } from "@/app/navigation";
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
  const password = typeof passwordValue === "string" ? passwordValue.trim() : "";

  if (!isValidLogin(username, password)) {
    if (!wantsJson) {
      return redirectResponse("/login?error=1");
    }

    return NextResponse.json({ message: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const homePath = `/?seccion=mes&mes=${encodeURIComponent(getDefaultMonthLabel())}`;

  const response = wantsJson ? NextResponse.json({ ok: true, redirectTo: homePath }) : redirectResponse(homePath);
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

function redirectResponse(location: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: location,
    },
  });
}
