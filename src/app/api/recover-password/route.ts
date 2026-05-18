import { NextResponse } from "next/server";

const RESEND_API_URL = "https://api.resend.com/emails";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const recoveryEmail = process.env.APP_RECOVERY_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.APP_FROM_EMAIL ?? "Forseti <onboarding@resend.dev>";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Introduce un email valido para poder contactarte." }, { status: 400 });
  }

  if (!recoveryEmail || !resendApiKey) {
    return NextResponse.json(
      { message: "La solicitud queda pendiente: falta configurar el email de recuperacion en el hosting." },
      { status: 200 },
    );
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recoveryEmail,
        subject: "Solicitud de recuperacion de acceso - Forseti",
        text: [
          "Se ha solicitado recuperar el acceso a Contabilidad Forseti.",
          "",
          `Email de contacto: ${email}`,
          "",
          "Mensaje:",
          message || "Sin mensaje adicional.",
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ message: "No se pudo enviar la solicitud. Revisa la configuracion del email." }, { status: 200 });
    }
  } catch {
    return NextResponse.json({ message: "No se pudo contactar con el servicio de email. Intentalo mas tarde." }, { status: 200 });
  }

  return NextResponse.json({ message: "Solicitud enviada. Te contactaran para restablecer el acceso." });
}
