"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  showBrand?: boolean;
};

export function LoginForm({ showBrand = true }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.forsetiHydrated = "true";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError("Usuario o contrasena incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleRecoverySubmit() {
    setRecoveryStatus("");
    setIsRecovering(true);

    const response = await fetch("/api/recover-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: recoveryEmail, message: recoveryMessage }),
    });
    const result = await response.json().catch(() => null);

    setIsRecovering(false);

    if (!response.ok) {
      setRecoveryStatus(result?.message ?? "No se pudo enviar la solicitud. Intentalo de nuevo.");
      return;
    }

    setRecoveryEmail("");
    setRecoveryMessage("");
    setRecoveryStatus(result?.message ?? "Solicitud enviada.");
  }

  return (
    <form
      action="/api/login"
      method="post"
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur"
    >
      {showBrand ? (
        <div className="text-center">
          <Image src="/logos-forseti.png" alt="Forseti" width={220} height={78} priority className="mx-auto h-auto w-44" />
          <h1 className="mt-3 text-[22px] font-semibold text-white">Administracion y contabilidad</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Inicia sesion para consultar la contabilidad y el resumen mensual.</p>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-[22px] font-semibold text-white">Administracion y contabilidad</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Inicia sesion para consultar la contabilidad y el resumen mensual.</p>
        </div>
      )}

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-200">
        Usuario
        <input
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300"
          autoComplete="username"
          required
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-200">
        Contrasena
        <span className="relative block w-full">
          <input
            name="password"
            id="forseti-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            data-password-toggle="forseti-password"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-300 transition hover:bg-[#5ab94e]/15 hover:text-[#5ab94e]"
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            title={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          >
            {showPassword ? (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.3A10.3 10.3 0 0 1 12 4c5 0 8.7 4 10 8a13.2 13.2 0 0 1-3.1 4.8" />
                <path d="M6.1 6.2A13.4 13.4 0 0 0 2 12c1.3 4 5 8 10 8 1.5 0 2.9-.4 4.1-1" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M2 12s3.8-8 10-8 10 8 10 8-3.8 8-10 8-10-8-10-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </span>
      </label>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowRecovery((current) => !current)}
          className="w-full rounded-lg border border-[#5ab94e]/40 bg-[#5ab94e]/10 px-4 py-3 text-center text-sm font-semibold text-[#eff8ed] transition hover:border-[#5ab94e]/70 hover:bg-[#5ab94e]/20"
          aria-expanded={showRecovery}
        >
          Recuperar contrasena
        </button>

        {showRecovery ? (
          <div className="rounded-lg border border-[#5ab94e]/25 bg-[#5ab94e]/10 px-4 py-3 text-sm leading-6 text-[#eff8ed]">
            <p className="font-semibold">Recuperar acceso</p>
            <p className="mt-1 text-[#eff8ed]/80">Envia una solicitud al administrador para revisar o restablecer el acceso.</p>

            <label className="mt-3 flex flex-col gap-2 font-medium text-[#eff8ed]">
              Email de contacto
              <input
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
              />
            </label>

            <label className="mt-3 flex flex-col gap-2 font-medium text-[#eff8ed]">
              Mensaje
              <textarea
                value={recoveryMessage}
                onChange={(event) => setRecoveryMessage(event.target.value)}
                className="min-h-24 resize-y rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300"
                placeholder="Explica brevemente que necesitas recuperar el acceso."
              />
            </label>

            {recoveryStatus ? <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-[#eff8ed]/90">{recoveryStatus}</p> : null}

            <button
              type="button"
              onClick={handleRecoverySubmit}
              disabled={isRecovering || !recoveryEmail}
              className="mt-3 w-full rounded-lg bg-[#5ab94e] px-4 py-3 font-semibold text-slate-950 transition hover:bg-[#6dcc62] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRecovering ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-[#5ab94e] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#6dcc62] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
