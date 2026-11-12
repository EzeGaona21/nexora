"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { transitions } from "@/lib/motion";
import { REPORT_META, REPORT_TYPES, type ReportType } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

export function ReportTabs({ active, query }: { active: ReportType; query: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="flex w-max gap-1 border-b border-border" aria-label="Tipo de reporte">
        {REPORT_TYPES.map((type) => {
          const isActive = type === active;
          return (
            <Link
              key={type}
              href={`/reportes?tipo=${type}${query ? `&${query}` : ""}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap px-3 py-2.5 text-sm transition-colors duration-150",
                isActive ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {REPORT_META[type].title}
              {isActive ? (
                <motion.span
                  layoutId="report-tab"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                  transition={transitions.spring}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
