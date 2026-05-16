"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
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
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-300"
          type="password"
          autoComplete="current-password"
          required
        />
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
