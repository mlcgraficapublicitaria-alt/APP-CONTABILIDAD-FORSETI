import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0b1020] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="mx-auto w-full max-w-md overflow-hidden bg-transparent">
          <div className="forseti-login-hero relative aspect-[4/3] w-full">
            <Image
              src="/cabecera-forseti-login.jpg"
              alt=""
              fill
              priority
              sizes="(max-width: 767px) 100vw, 448px"
              className="object-contain object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(11,16,32,0)_28%,rgba(11,16,32,0.24)_56%,rgba(11,16,32,0.94)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0b1020] to-transparent sm:h-24 md:h-32" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1020] to-transparent sm:h-28 md:h-36" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0b1020] to-transparent sm:w-24 md:w-32" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0b1020] to-transparent sm:w-24 md:w-32" />
            <span className="forseti-hero-bg-latency" aria-hidden="true" />
            <span className="forseti-hero-eye-core" aria-hidden="true" />
            <span className="forseti-hero-eye-aura" aria-hidden="true" />
            <span className="forseti-hero-eye-ray" aria-hidden="true" />
          </div>
        </header>

        <div className="flex justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
