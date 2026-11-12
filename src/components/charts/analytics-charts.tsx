"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatARS, formatARSCompact, formatLongDay } from "@/lib/format";

const AXIS_TICK = { fill: "#64748B", fontSize: 12 };
const GRID = "#1E293B";

interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
}

function TooltipCard({
  active,
  label,
  payload,
  formatLabel,
}: {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry>;
  formatLabel: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg border border-border px-3 py-2.5 shadow-pop">
      <p className="mb-1.5 text-xs text-muted first-letter:uppercase">{formatLabel(String(label))}</p>
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center justify-between gap-6 text-[13px]">
            <span className="flex items-center gap-2 text-muted">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color ?? "#8B5CF6" }} aria-hidden />
              {entry.name}
            </span>
            <span className="num font-medium text-fg">{formatARS(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortDay(date: string) {
  return `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`;
}

export interface RevenueProfitPoint {
  date: string;
  revenue: number;
  profit: number;
}

/** Facturación (área) y ganancia bruta (línea) día por día. */
export function RevenueProfitChart({ data }: { data: RevenueProfitPoint[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de facturación y ganancia bruta por día">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fill-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tickFormatter={formatARSCompact} tick={AXIS_TICK} tickLine={false} axisLine={false} width={68} />
          <Tooltip content={<TooltipCard formatLabel={formatLongDay} />} cursor={{ stroke: "#2B3A52" }} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Facturación"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#fill-revenue)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#A78BFA" }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Ganancia bruta"
            stroke="#F8FAFC"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: "#F8FAFC" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface BarPoint {
  label: string;
  value: number;
}

/** Barras verticales; la más alta se destaca en esmeralda pleno. */
export function BarsChart({
  data,
  seriesName,
  ariaLabel,
}: {
  data: BarPoint[];
  seriesName: string;
  ariaLabel: string;
}) {
  const max = Math.max(0, ...data.map((d) => d.value));
  return (
    <div className="h-60 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={formatARSCompact} tick={AXIS_TICK} tickLine={false} axisLine={false} width={68} />
          <Tooltip content={<TooltipCard formatLabel={(l) => l} />} cursor={{ fill: "rgb(148 163 184 / 0.06)" }} />
          <Bar dataKey="value" name={seriesName} radius={[5, 5, 0, 0]} maxBarSize={44}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.value === max && max > 0 ? "#8B5CF6" : "#3F2C73"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
