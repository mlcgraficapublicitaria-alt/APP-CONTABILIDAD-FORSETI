"use client";

import { useRouter } from "next/navigation";

type YearSelectProps = {
  years: string[];
  selectedYear: string;
  selectedMonth: string;
  section: string;
};

export function YearSelect({ years, selectedYear, selectedMonth, section }: YearSelectProps) {
  const router = useRouter();

  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-400 sm:min-w-56">
      ELEGIR AÑO
      <select
        value={selectedYear}
        onChange={(event) => {
          const params = new URLSearchParams({
            seccion: section,
            mes: selectedMonth,
            ano: event.target.value,
          });
          router.push(`/?${params.toString()}`, { scroll: false });
        }}
        className="h-11 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-medium text-white outline-none transition focus:border-cyan-300"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}