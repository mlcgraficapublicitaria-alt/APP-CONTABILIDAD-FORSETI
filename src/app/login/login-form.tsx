"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="text-center">
        <Image src="/logo-forseti.png" alt="Forseti" width={220} height={78} priority className="mx-auto h-auto w-44" />
        <h1 className="mt-3 text-[22px] font-semibold text-white">Administracion y contabilidad</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Inicia sesion para consultar la contabilidad y el resumen mensual.</p>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-200">
        Usuario
        <input
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-300 transition hover:bg-white/10 hover:text-white"
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

      {error ? <p className="rounded-lg border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
