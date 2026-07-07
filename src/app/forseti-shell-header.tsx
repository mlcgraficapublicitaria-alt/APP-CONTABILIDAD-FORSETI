import Image from "next/image";

export function ForsetiShellHeader() {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
      <div className="forseti-dashboard-hero relative flex min-h-[420px] flex-col justify-between px-5 py-5 sm:min-h-[460px] sm:px-7 sm:py-6 md:min-h-56 lg:min-h-64">
        <Image
          src="/cabecera-forseti-web-movil.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 767px) 100vw, 0px"
          className="object-cover object-center md:hidden"
        />
        <Image
          src="/cabecera-forseti-web.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 100vw, 0px"
          className="hidden object-cover object-center md:block"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1020]/55 via-[#0b1020]/18 to-[#0b1020]/82 md:bg-[linear-gradient(90deg,rgba(11,16,32,0.96)_0%,rgba(11,16,32,0.72)_34%,rgba(11,16,32,0.22)_68%,rgba(11,16,32,0.08)_100%)]" />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-transparent via-transparent to-[#0b1020]/70 md:block" />
        <span className="forseti-hero-bg-latency forseti-dashboard-bg-latency" aria-hidden="true" />
        <span className="forseti-hero-eye-core forseti-dashboard-eye-core" aria-hidden="true" />
        <span className="forseti-hero-eye-aura forseti-dashboard-eye-aura" aria-hidden="true" />
        <span className="forseti-hero-eye-ray forseti-dashboard-eye-ray" aria-hidden="true" />

        <form action="/api/logout" method="post" className="absolute right-5 top-5 z-20 sm:right-6 sm:top-6">
          <button className="rounded-lg border border-[#5ab94e]/70 bg-[#5ab94e] px-4 py-2 text-sm font-medium text-slate-950 backdrop-blur transition hover:bg-[#6dcc62]">
            Salir
          </button>
        </form>

        <div className="relative z-10 max-w-md pr-24">
          <Image
            src="/logos-forseti.png"
            alt="Forseti"
            width={220}
            height={78}
            priority
            className="h-auto w-40 drop-shadow-[0_10px_24px_rgba(0,0,0,0.75)] sm:w-48"
          />
          <h1 className="mt-4 hidden text-2xl font-semibold text-white md:block">
            Administración y contabilidad
          </h1>
        </div>

        <h1 className="absolute bottom-6 left-1/2 z-10 w-[calc(100%-2rem)] -translate-x-1/2 whitespace-nowrap text-center text-[clamp(18px,5.2vw,22px)] font-semibold text-white md:hidden">
          Administración y contabilidad
        </h1>
      </div>
    </header>
  );
}
