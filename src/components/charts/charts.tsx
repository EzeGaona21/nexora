"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatARS, formatARSCompact, formatLongDay } from "@/lib/format";

const AXIS_TICK = { fill: "#64748B", fontSize: 12 };
const GRID = "#1E293B";

function shortDay(date: string) {
  // "11/11" — compacto para el eje.
  return `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`;
}

interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
}

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg border border-border px-3 py-2.5 shadow-pop">
      <p className="mb-1.5 text-xs capitalize text-muted">{formatLongDay(String(label))}</p>
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => {
          const value = entry.value;
          const text = Array.isArray(value)
            ? `${formatARS(Number(value[0]))} – ${formatARS(Number(value[1]))}`
            : formatARS(Number(value));
          return (
            <li key={String(entry.dataKey)} className="flex items-center justify-between gap-6 text-[13px]">
              <span className="flex items-center gap-2 text-muted">
                <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
                {entry.name}
              </span>
              <span className="num font-medium text-fg">{text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LegendDot({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <span
        aria-hidden
        className="h-0 w-4 border-t-2"
        style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }}
      />
      {label}
    </span>
  );
}

export interface ComparisonPoint {
  date: string;
  current: number;
  previous: number;
}

/** Facturación diaria del período contra el período anterior alineado. */
export function SalesComparisonChart({ data }: { data: ComparisonPoint[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de facturación diaria comparada con el período anterior">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fill-current" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tickFormatter={formatARSCompact} tick={AXIS_TICK} tickLine={false} axisLine={false} width={68} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2B3A52" }} />
          <Area
            type="monotone"
            dataKey="previous"
            name="Período anterior"
            stroke="#64748B"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="current"
            name="Período actual"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#fill-current)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#A78BFA" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface ForecastChartPoint {
  date: string;
  actual?: number;
  backtest?: number;
  forecast?: number;
  band?: [number, number];
}

/** Ventas reales, lo que el modelo habría estimado (backtest) y la proyección con su banda. */
export function ForecastChart({ data, today }: { data: ForecastChartPoint[]; today: string }) {
  return (
    <div className="h-80 w-full" role="img" aria-label="Gráfico de ventas reales y estimadas con banda de incertidumbre">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tickFormatter={formatARSCompact} tick={AXIS_TICK} tickLine={false} axisLine={false} width={68} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2B3A52" }} />
          <ReferenceLine
            x={today}
            stroke="#2B3A52"
            strokeDasharray="2 4"
            label={{ value: "Ayer", position: "insideTopRight", fill: "#64748B", fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="band"
            name="Rango probable (80 %)"
            stroke="none"
            fill="#8B5CF6"
            fillOpacity={0.12}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="backtest"
            name="Estimado por el modelo"
            stroke="#64748B"
            strokeWidth={1.5}
            strokeDasharray="3 4"
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Ventas reales"
            stroke="#F8FAFC"
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#F8FAFC" }}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Proyección"
            stroke="#8B5CF6"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#A78BFA" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
