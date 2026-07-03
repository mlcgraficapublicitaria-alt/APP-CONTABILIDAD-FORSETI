import Link from "next/link";
import { TOOLS } from "./navigation";

type ToolsNavProps = {
  activeTool?: string;
  layout?: "tabs" | "cards";
};

export function ToolsNav({ activeTool, layout = "tabs" }: ToolsNavProps) {
  if (layout === "cards") {
    return (
      <div className="grid w-full max-w-4xl justify-items-center gap-4 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className="group flex w-full max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-sm backdrop-blur transition hover:border-[#5ab94e]/60 hover:bg-[#5ab94e]/10"
          >
            <p className="w-full text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#5ab94e]">
              {tool.label}
            </p>
            <h3 className="mx-auto mt-3 w-full max-w-xs text-center text-2xl font-semibold text-white">
              {tool.title}
            </h3>
            <p className="mx-auto mt-3 w-full max-w-sm text-center text-sm leading-6 text-zinc-400">
              {tool.description}
            </p>
            <span className="mx-auto mt-5 inline-flex justify-center rounded-lg bg-[#5ab94e] px-4 py-2 text-center text-sm font-semibold text-slate-950 transition group-hover:bg-[#6dcc62]">
              Abrir herramienta
            </span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <nav aria-label="Herramientas" className="flex flex-wrap gap-2">
      <Link
        href="/?seccion=herramientas"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-zinc-200 transition hover:border-[#5ab94e]/60 hover:text-white"
      >
        TODAS
      </Link>
      {TOOLS.map((tool) => {
        const isActive = tool.id === activeTool;

        return (
          <Link
            key={tool.id}
            href={tool.href}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold tracking-[0.12em] transition ${
              isActive
                ? "border-[#5ab94e] bg-[#5ab94e] text-slate-950"
                : "border-white/10 bg-white/5 text-zinc-200 hover:border-[#5ab94e]/60 hover:text-white"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {tool.label.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
