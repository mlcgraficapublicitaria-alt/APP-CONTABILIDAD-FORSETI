import { NextResponse } from "next/server";
import { issueTokens, refreshCurrentUser, setAuthCookies } from "@/lib/renta-fiscal/auth";

export async function POST() {
  const user = await refreshCurrentUser();
  if (!user) return NextResponse.json({ error: "Refresh token invalido." }, { status: 401 });

  const response = NextResponse.json({ user });
  setAuthCookies(response, issueTokens(user));
  return response;
}
