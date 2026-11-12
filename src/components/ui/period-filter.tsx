"use client";

import { CalendarRange } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { transitions } from "@/lib/motion";
import { PERIOD_PRESETS, type Period } from "@/lib/period";
import { cn } from "@/lib/utils";

/**
 * Selector de período: atajos + rango propio. Todo viaja en la URL
 * (?rango= o ?desde=&hasta=), así la vista se puede compartir y recargar.
 */
export function PeriodFilter({
  period,
  today,
  extraParams,
}: {
  period: Period;
  today: string;
  /** Parámetros que deben conservarse al cambiar de período (p. ej. el tipo de reporte). */
  extraParams?: Record<string, string>;
}) {
  const pathname = usePathname();
  const extra = new URLSearchParams(extraParams);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-fit items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="Período">
        {PERIOD_PRESETS.map((p) => {
          const active = period.preset === p.key;
          const params = new URLSearchParams(extra);
          params.set("rango", p.key);
          return (
            <Link
              key={p.key}
              href={`${pathname}?${params.toString()}`}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={cn(
                "relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
                active ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-md border border-border-strong bg-raised"
                  transition={transitions.spring}
                />
              ) : null}
              <span className="relative">{p.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Formulario GET nativo: funciona incluso sin JavaScript. */}
      <form method="get" action={pathname} className="flex flex-wrap items-center gap-2">
        {Object.entries(extraParams ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <CalendarRange className="hidden size-4 text-subtle sm:block" aria-hidden />
        <label className="sr-only" htmlFor="period-from">
          Desde
        </label>
        <Input
          id="period-from"
          type="date"
          name="desde"
          defaultValue={period.from}
          max={today}
          required
          className="num h-9 w-auto"
          key={`from-${period.from}`}
        />
        <span className="text-xs text-subtle">al</span>
        <label className="sr-only" htmlFor="period-to">
          Hasta
        </label>
        <Input
          id="period-to"
          type="date"
          name="hasta"
          defaultValue={period.to}
          max={today}
          required
          className="num h-9 w-auto"
          key={`to-${period.to}`}
        />
        <Button type="submit" variant="secondary" size="sm" className="h-9">
          Aplicar
        </Button>
      </form>
    </div>
  );
}
