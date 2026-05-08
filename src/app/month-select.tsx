"use client";

import { useRouter } from "next/navigation";

type MonthSelectProps = {
  months: string[];
  selectedMonth: string;
  section: string;
};

export function MonthSelect({ months, selectedMonth, section }: MonthSelectProps) {
  const router = useRouter();

  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-400 sm:min-w-56">
      Mes
      <select
        value={selectedMonth}
        onChange={(event) => {
          const params = new URLSearchParams({
            seccion: section,
            mes: event.target.value,
          });
          router.push(`/?${params.toString()}`);
        }}
        className="h-11 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-medium text-white outline-none transition focus:border-cyan-300"
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>
    </label>
  );
}
