"use client";

import { ChartNoAxesCombined, Info, PackageSearch, Sprout, Truck } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { ForecastChart, LegendDot, type ForecastChartPoint } from "@/components/charts/charts";
import { Delta } from "@/components/dashboard/kpi-card";
import { AnimatedNumber, GrowBar } from "@/components/motion/primitives";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { WEEKDAY_NAMES } from "@/lib/dates";
import {
  estimateStockNeeds,
  growthCandidates,
  lowRotation,
  sumForecast,
  type DailyPoint,
  type ForecastResult,
  type ProductDemand,
} from "@/lib/forecast/forecast";
import { formatARS, formatNumber, formatPct } from "@/lib/format";
import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

const HORIZONS = [7, 14, 30] as const;
type Horizon = (typeof HORIZONS)[number];

export function ForecastView({
  history,
  forecast,
  products,
  windowDays,
  lastDay,
}: {
  history: DailyPoint[];
  forecast: ForecastResult;
  products: ProductDemand[];
  windowDays: number;
  lastDay: string;
}) {
  const [horizon, setHorizon] = useState<Horizon>(14);

  const chartData = useMemo<ForecastChartPoint[]>(() => {
    const backtest = new Map(forecast.backtest.map((p) => [p.date, p.value]));
    const rows: ForecastChartPoint[] = history.map((p) => ({
      date: p.date,
      actual: p.value,
      backtest: backtest.get(p.date),
    }));
    // La proyección arranca en el último valor real para que la línea sea continua.
    const last = rows[rows.length - 1];
    if (last && forecast.points.length > 0) last.forecast = last.actual;
    for (const p of forecast.points.slice(0, horizon)) {
      rows.push({ date: p.date, forecast: p.value, band: [p.lower, p.upper] });
    }
    return rows;
  }, [history, forecast, horizon]);

  const total = useMemo(() => sumForecast(forecast.points, horizon), [forecast.points, horizon]);
  const lastPeriod = useMemo(
    () => history.slice(-Math.min(horizon, history.length)).reduce((a, p) => a + p.value, 0),
    [history, horizon],
  );
  // Solo se compara contra el período previo si hay historia suficiente para cubrirlo.
  const comparable = history.length >= horizon && lastPeriod > 0;

  const needs = useMemo(() => estimateStockNeeds(products, windowDays, horizon), [products, windowDays, horizon]);
  const growing = useMemo(() => growthCandidates(products), [products]);
  const slow = useMemo(() => lowRotation(products, windowDays), [products, windowDays]);

  const header = (
    <PageHeader
      title="Predicciones"
      description="Estimaciones estadísticas sobre tu historial de ventas. Son proyecciones, no certezas."
      actions={
        forecast.sufficient ? (
          <div className="flex rounded-lg border border-border bg-surface p-1" role="tablist" aria-label="Horizonte de predicción">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                role="tab"
                aria-selected={horizon === h}
                onClick={() => setHorizon(h)}
                className={cn(
                  "relative cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors",
                  horizon === h ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {horizon === h ? (
                  <motion.span
                    layoutId="horizon-pill"
                    className="absolute inset-0 rounded-md border border-border bg-raised"
                    transition={transitions.spring}
                  />
                ) : null}
                <span className="num relative">{h} días</span>
              </button>
            ))}
          </div>
        ) : undefined
      }
    />
  );

  if (!forecast.sufficient) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<ChartNoAxesCombined />}
            title="Todavía no hay datos suficientes para predecir"
            description={forecast.message ?? ""}
          />
        </Card>
      </>
    );
  }

  const maxIndex = Math.max(...(forecast.seasonality?.map((s) => s.index) ?? [1]));

  return (
    <>
      {header}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="p-5">
          <p className="text-[13px] text-muted">Facturación estimada · próximos {horizon} días</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            <AnimatedNumber value={total.total} format="ars" />
          </p>
          <p className="num mt-1.5 text-xs text-subtle">
            Rango probable: {formatARS(total.lower)} a {formatARS(total.upper)}
          </p>
          {comparable ? (
            <p className="mt-2 flex items-center gap-2">
              <Delta change={((total.total - lastPeriod) / lastPeriod) * 100} />
              <span className="text-xs text-subtle">vs. últimos {horizon} días</span>
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <p className="text-[13px] text-muted">Tendencia</p>
          {forecast.trend ? (
            <>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {forecast.trend.direction === "up" ? "En alza" : forecast.trend.direction === "down" ? "En baja" : "Estable"}
              </p>
              <p className="mt-1.5 flex items-center gap-2">
                <Delta change={forecast.trend.weeklyChangePct} />
                <span className="text-xs text-subtle">por semana, últimas 4 semanas</span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Se calcula a partir de 4 semanas de historia.</p>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-[13px] text-muted">Precisión medida</p>
          {forecast.accuracy?.mape !== null && forecast.accuracy ? (
            <>
              <p className="num mt-2 text-2xl font-semibold tracking-tight">
                ± {formatPct(forecast.accuracy.mape ?? 0)}
              </p>
              <p className="mt-1.5 text-xs text-subtle">
                Error promedio por día al predecir los últimos {forecast.accuracy.holdoutDays} días ya ocurridos.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Sin ventas suficientes en el período de prueba para medirla.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Ventas reales y estimadas"
          description={`${forecast.methodLabel} · ${forecast.historyDays} días de historia`}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-5 pt-3">
          <LegendDot color="#F8FAFC" label="Ventas reales" />
          <LegendDot color="#64748B" label="Lo que el modelo habría estimado" dashed />
          <LegendDot color="#10B981" label="Proyección y rango probable" dashed />
        </div>
        <div className="p-2 pt-3 sm:p-4">
          <ForecastChart data={chartData} today={lastDay} />
        </div>
        <p className="flex items-start gap-2 border-t border-border px-5 py-3.5 text-xs leading-relaxed text-subtle">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {forecast.message ? `${forecast.message} ` : ""}
            La banda verde es el rango donde caería la venta de cada día en 8 de cada 10 casos, según el
            error medido. No contempla feriados, promociones ni cambios de precios.
          </span>
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {forecast.seasonality ? (
          <Card>
            <CardHeader title="Estacionalidad semanal" description="Cuánto vende cada día respecto de un día promedio" />
            <ul className="flex flex-col gap-3 p-5">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const s = forecast.seasonality!.find((x) => x.weekday === wd)!;
                return (
                  <li key={wd} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3">
                    <span className="text-sm text-muted">{WEEKDAY_NAMES[wd]}</span>
                    <GrowBar ratio={maxIndex > 0 ? s.index / maxIndex : 0} className={s.index >= 1 ? "bg-brand" : "bg-border-strong"} />
                    <span className="num text-right text-[13px]">
                      {s.index >= 1 ? "+" : "−"}
                      {Math.abs(Math.round((s.index - 1) * 100))} %
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Necesidades de stock"
            description={`Para cubrir ${horizon} días al ritmo de los últimos ${windowDays}`}
          />
          {needs.length === 0 ? (
            <EmptyState
              icon={<Truck />}
              title="El stock actual alcanza"
              description={`Ningún producto necesita reposición para los próximos ${horizon} días al ritmo de venta actual.`}
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border px-5 py-2">
              {needs.slice(0, 8).map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{n.name}</p>
                    <p className="num text-xs text-subtle">
                      Stock {n.stock} · {formatNumber(n.dailyRate)} u/día ·{" "}
                      {n.coverageDays === 0 ? "sin cobertura" : `cubre ${n.coverageDays} ${n.coverageDays === 1 ? "día" : "días"}`}
                    </p>
                  </div>
                  <Badge tone={(n.coverageDays ?? 0) <= 3 ? "danger" : "warning"}>
                    <span className="num">Pedir {n.suggestedOrder}</span>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {needs.length > 8 ? (
            <p className="border-t border-border px-5 py-3 text-xs text-subtle">
              Y {needs.length - 8} productos más con reposición sugerida.
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Productos con potencial de crecimiento"
            description={`Unidades vendidas: últimos ${windowDays} días vs. los ${windowDays} anteriores`}
          />
          {growing.length === 0 ? (
            <EmptyState
              icon={<Sprout />}
              title="Sin crecimientos marcados"
              description="Ningún producto con volumen suficiente creció 20 % o más entre períodos."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border px-5 py-2">
              {growing.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{p.name}</p>
                    <p className="num text-xs text-subtle">
                      {p.unitsPrevWindow} → {p.unitsWindow} unidades
                    </p>
                  </div>
                  <Delta change={p.changePct} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Productos con baja rotación"
            description={`Con stock y menos de una venta por semana en ${windowDays} días`}
          />
          {slow.length === 0 ? (
            <EmptyState
              icon={<PackageSearch />}
              title="Todo el catálogo rota"
              description="Ningún producto con stock quedó por debajo de una venta por semana."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border px-5 py-2">
              {slow.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{p.name}</p>
                    <p className="num text-xs text-subtle">{p.sku}</p>
                  </div>
                  <span className="num shrink-0 text-right text-[13px] text-muted">
                    {p.unitsWindow} vendidas · {p.stock} en stock
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
