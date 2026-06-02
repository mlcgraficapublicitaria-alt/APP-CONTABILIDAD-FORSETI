"use client";

import Link from "next/link";
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

  return (
    <nav
      aria-label="Secciones"
      className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm backdrop-blur sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-start lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0"
    >
      {sections.map((section) => {
        const isActive = section.id === activeSection;

        return (
          <Link
            key={section.id}
            href={section.href ?? `/?seccion=${section.id}&mes=${encodeURIComponent(selectedMonth)}`}
            scroll={false}
            className={`flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-center text-xs font-semibold transition sm:text-sm lg:min-h-0 lg:px-4 ${
              isActive ? "bg-[#5ab94e] text-slate-950 shadow-sm shadow-[#5ab94e]/20" : "text-zinc-300 hover:bg-[#5ab94e]/15 hover:text-white"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
