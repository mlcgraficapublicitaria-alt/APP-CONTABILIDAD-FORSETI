import { NextResponse } from "next/server";
import { getDefaultMonthLabel } from "@/app/navigation";
import { AUTH_COOKIE_NAME, createSessionToken } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 8;

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "El acceso de pruebas no está disponible." }, { status: 404 });
  }

  const redirectTo = `/?seccion=mes&mes=${encodeURIComponent(getDefaultMonthLabel())}`;
  const response = NextResponse.json({ ok: true, redirectTo });

  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
