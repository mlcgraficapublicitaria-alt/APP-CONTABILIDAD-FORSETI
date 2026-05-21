import { LoginForm } from "./login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
          <div
            className="relative flex min-h-40 items-start bg-cover bg-center px-5 py-5 sm:min-h-48 sm:px-7 sm:py-6 lg:min-h-56"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(11, 16, 32, 0.96) 0%, rgba(11, 16, 32, 0.72) 34%, rgba(11, 16, 32, 0.24) 68%, rgba(11, 16, 32, 0.08) 100%), url('/cabecera-forseti-web.jpg')",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0b1020]/70" />
            <Image
              src="/logo-forseti.png"
              alt="Forseti"
              width={220}
              height={78}
              priority
              className="relative z-10 h-auto w-40 drop-shadow-[0_10px_24px_rgba(0,0,0,0.75)] sm:w-48"
            />
          </div>
        </header>

        <div className="flex justify-center">
          <LoginForm showBrand={false} />
        </div>
      </div>
    </main>
  );
}
