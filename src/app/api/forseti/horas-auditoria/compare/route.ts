import { NextResponse } from "next/server";
import { compareHoursAction } from "@/app/forseti/horas-auditoria/actions";
import { isForsetiAgentAuthorized } from "@/lib/agent-auth";
import { hasValidSession } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isForsetiAgentAuthorized(request) && !(await hasValidSession())) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const result = await compareHoursAction({}, await request.formData());
  return NextResponse.json(result, { status: result.error ? 422 : 200 });
}
