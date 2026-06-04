import { NextResponse } from "next/server";
import { issueTokens, loginWithPassword, setAuthCookies } from "@/lib/renta-fiscal/auth";
import { readJson } from "@/lib/renta-fiscal/api";
import { writeAuditEvent } from "@/lib/renta-fiscal/audit";

type LoginBody = {
  email: string;
  password: string;
};

export async function POST(request: Request) {
  const body = await readJson<LoginBody>(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = await loginWithPassword(email, password);
  if (!user) {
    return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
  }

  const tokens = issueTokens(user);
  const response = NextResponse.json({ user });
  setAuthCookies(response, tokens);
  await writeAuditEvent({ userId: user.id, action: "login", entity: "User", entityId: user.id });
  return response;
}
