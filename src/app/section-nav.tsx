"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

type Section = {
  id: string;
  label: string;
  href?: string;
};

type SectionNavProps = {
  sections: Section[];
  selectedMonth: string;
  activeSectionOverride?: string;
};

export function SectionNav({ sections, selectedMonth, activeSectionOverride }: SectionNavProps) {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("seccion");
  const activeSection = activeSectionOverride ?? (sections.some((section) => section.id === sectionParam) ? sectionParam : "mes");
  const activeLabel = sections.find((section) => section.id === activeSection)?.label ?? "SECCIONES";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav aria-label="Secciones" className="w-full lg:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:border-[#5ab94e]/50 lg:hidden"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true" className="h-5 w-5" />
        <span className="block w-full truncate text-center">{activeLabel}</span>
        <span aria-hidden="true" className="relative h-5 w-5 text-[#5ab94e]">
          <span className={`absolute left-0 top-1/2 h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "rotate-45" : "-translate-y-1.5"}`} />
          <span className={`absolute left-0 top-1/2 h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "opacity-0" : "opacity-100"}`} />
          <span className={`absolute left-0 top-1/2 h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "-rotate-45" : "translate-y-1.5"}`} />
        </span>
      </button>

      <div className={`${isOpen ? "grid" : "hidden"} mt-2 grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm backdrop-blur lg:mt-0 lg:flex lg:flex-wrap lg:justify-start lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0`}>
        {sections.map((section) => {
          const isActive = section.id === activeSection;

          return (
            <Link
              key={section.id}
              href={section.href ?? `/?seccion=${section.id}&mes=${encodeURIComponent(selectedMonth)}`}
              scroll={false}
              onClick={() => setIsOpen(false)}
              className={`flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-center text-xs font-semibold transition sm:text-sm lg:min-h-0 lg:px-4 ${
                isActive ? "bg-[#5ab94e] text-slate-950 shadow-sm shadow-[#5ab94e]/20" : "text-zinc-300 hover:bg-[#5ab94e]/15 hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}