"use client";

import {
  BellOff,
  CircleDollarSign,
  PackageX,
  Percent,
  Snowflake,
  TrendingDown,
  TriangleAlert,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { countBySeverity, type Alert, type AlertSeverity, type AlertType } from "@/lib/alerts/rules";
import { listItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TYPE_META: Record<AlertType, { label: string; icon: LucideIcon }> = {
  stock_out: { label: "Sin stock", icon: PackageX },
  stock_critical: { label: "Stock crítico", icon: TriangleAlert },
  restock: { label: "Reposición", icon: Truck },
  no_movement: { label: "Sin movimiento", icon: Snowflake },
  sales_drop: { label: "Caída de ventas", icon: TrendingDown },
  high_expense: { label: "Gastos elevados", icon: CircleDollarSign },
  low_margin: { label: "Margen reducido", icon: Percent },
};

const SEVERITY_META: Record<
  AlertSeverity,
  { label: string; tone: "danger" | "warning" | "info"; icon: string; ring: string }
> = {
  critical: { label: "Crítica", tone: "danger", icon: "text-danger bg-danger/10 border-danger/20", ring: "bg-danger" },
  warning: { label: "Atención", tone: "warning", icon: "text-warning bg-warning/10 border-warning/20", ring: "bg-warning" },
  info: { label: "Informativa", tone: "info", icon: "text-info bg-info/10 border-info/20", ring: "bg-info" },
};

export function AlertsView({ alerts, hasData }: { alerts: Alert[]; hasData: boolean }) {
  const [filter, setFilter] = useState<AlertType | "all">("all");

  const counts = useMemo(() => countBySeverity(alerts), [alerts]);
  const types = useMemo(() => {
    const map = new Map<AlertType, number>();
    for (const a of alerts) map.set(a.type, (map.get(a.type) ?? 0) + 1);
    return [...map.entries()];
  }, [alerts]);
  const visible = filter === "all" ? alerts : alerts.filter((a) => a.type === filter);

  const chip = (active: boolean) =>
    cn(
      "inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm transition-colors",
      active ? "border-border-strong bg-raised text-fg" : "border-border text-muted hover:text-fg",
    );

  return (
    <>
      <PageHeader
        title="Alertas"
        description="Reglas aplicadas sobre tus datos actuales. Cada alerta indica qué la disparó."
      />

      {alerts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BellOff />}
            title={hasData ? "Todo en orden" : "Todavía no hay nada que revisar"}
            description={
              hasData
                ? "Ninguna regla se disparó: stock, ventas, gastos y márgenes están dentro de lo esperado."
                : "Las alertas aparecen cuando cargás productos y registrás ventas y gastos."
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3 sm:gap-4">
            {(Object.keys(SEVERITY_META) as AlertSeverity[]).map((s) => (
              <Card key={s} className="p-4">
                <p className="flex items-center gap-2 text-[13px] text-muted">
                  <span className={cn("size-1.5 rounded-full", SEVERITY_META[s].ring)} aria-hidden />
                  {SEVERITY_META[s].label}
                </p>
                <p className="num mt-1.5 text-2xl font-semibold">{counts[s]}</p>
              </Card>
            ))}
          </div>

          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por tipo de alerta">
            <button type="button" className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              Todas <span className="num text-xs text-subtle">{alerts.length}</span>
            </button>
            {types.map(([type, count]) => (
              <button
                key={type}
                type="button"
                className={chip(filter === type)}
                aria-pressed={filter === type}
                onClick={() => setFilter(type)}
              >
                {TYPE_META[type].label} <span className="num text-xs text-subtle">{count}</span>
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((alert) => {
                const Icon = TYPE_META[alert.type].icon;
                const severity = SEVERITY_META[alert.severity];
                return (
                  <motion.li
                    key={alert.id}
                    layout
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="card flex gap-4 p-4 sm:p-5"
                  >
                    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", severity.icon)}>
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-[15px] font-medium">{alert.title}</h2>
                        <Badge tone={severity.tone}>{severity.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">{alert.description}</p>
                      <p className="mt-2 text-xs text-subtle">Regla: {alert.rule}</p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </>
      )}
    </>
  );
}
