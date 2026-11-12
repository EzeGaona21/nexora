"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { AnimatedNumber, SpotlightCard } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export function Delta({
  change,
  unit = "pct",
  className,
}: {
  change: number | null;
  /** pct: variación porcentual · pp: diferencia en puntos porcentuales. */
  unit?: "pct" | "pp";
  className?: string;
}) {
  if (change === null) {
    return <span className={cn("text-xs text-subtle", className)}>Sin base de comparación</span>;
  }
  const flat = Math.abs(change) < 0.05;
  const up = change > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const formatted = `${up && !flat ? "+" : ""}${change.toLocaleString("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} ${unit === "pp" ? "pp" : "%"}`;

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 text-xs font-medium",
        flat ? "text-muted" : up ? "text-brand-bright" : "text-danger",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatted}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  format,
  change,
  changeUnit = "pct",
  caption,
  icon,
}: {
  label: string;
  value: number;
  format: "ars" | "number" | "pct";
  change: number | null;
  changeUnit?: "pct" | "pp";
  caption: string;
  icon: ReactNode;
}) {
  return (
    <SpotlightCard className="h-full">
      <div className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-muted">{label}</p>
          <span className="text-subtle [&_svg]:size-4" aria-hidden>
            {icon}
          </span>
        </div>
        <p className="mt-3 truncate text-xl font-semibold tracking-tight sm:text-2xl">
          <AnimatedNumber value={value} format={format} />
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-2.5">
          <Delta change={change} unit={changeUnit} />
          <span className="text-xs text-subtle">{caption}</span>
        </div>
      </div>
    </SpotlightCard>
  );
}
