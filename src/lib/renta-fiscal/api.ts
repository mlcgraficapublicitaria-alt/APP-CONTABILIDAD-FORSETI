import { NextResponse } from "next/server";
import { getCurrentUser, type RentaFiscalUser } from "./auth";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  return { user, response: null };
}

export async function readJson<T>(request: Request) {
  return (await request.json().catch(() => ({}))) as Partial<T>;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "No encontrado.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function getIpAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
}

export type AuthedContext = {
  user: RentaFiscalUser;
};
