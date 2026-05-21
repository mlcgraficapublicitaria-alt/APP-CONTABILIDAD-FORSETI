import { LoginForm } from "./login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
          <div className="relative flex min-h-[360px] items-start px-5 py-5 sm:min-h-[420px] sm:px-7 sm:py-6 md:min-h-48 lg:min-h-56">
            <Image
              src="/cabecera-forseti-login.jpg"
              alt=""
              fill
              priority
              sizes="(max-width: 767px) 100vw, 0px"
              className="object-cover object-[center_42%] md:hidden"
            />
            <Image
              src="/cabecera-forseti-login.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 100vw, 0px"
              className="hidden object-cover object-[center_42%] md:block"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1020]/55 via-[#0b1020]/18 to-[#0b1020]/82 md:bg-[linear-gradient(90deg,rgba(11,16,32,0.96)_0%,rgba(11,16,32,0.72)_34%,rgba(11,16,32,0.24)_68%,rgba(11,16,32,0.08)_100%)]" />
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-transparent via-transparent to-[#0b1020]/70 md:block" />
          </div>
        </header>

        <div className="flex justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
