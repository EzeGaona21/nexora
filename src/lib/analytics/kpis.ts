/**
 * Indicadores del dashboard — módulo puro.
 * Compara el período en curso contra el período anterior equivalente:
 * hoy vs. ayer, y mes a la fecha vs. los mismos días del mes pasado.
 */

import { addDays, addMonths, dayOfMonth, daysInMonth, startOfMonth } from "../dates.ts";

export interface DailySales {
  date: string;
  revenue: number;
  cost: number;
  sales_count: number;
  units: number;
}

export interface Kpi {
  value: number;
  previous: number;
  /** Variación porcentual; null cuando no hay base de comparación. */
  changePct: number | null;
}

export interface DashboardKpis {
  todayRevenue: Kpi;
  monthRevenue: Kpi;
  /** Facturación − costo de la mercadería vendida (mes a la fecha). */
  grossProfit: Kpi;
  salesCount: Kpi;
  avgTicket: Kpi;
  /** Margen bruto sobre facturación, en puntos porcentuales. */
  marginPct: Kpi;
  /** Ganancia bruta − gastos del mes. */
  netResult: number;
  monthExpenses: number;
  periodLabel: string;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function kpi(value: number, previous: number): Kpi {
  return { value, previous, changePct: pctChange(value, previous) };
}

function sumRange(daily: DailySales[], from: string, to: string) {
  let revenue = 0;
  let cost = 0;
  let count = 0;
  for (const d of daily) {
    if (d.date >= from && d.date <= to) {
      revenue += d.revenue;
      cost += d.cost;
      count += d.sales_count;
    }
  }
  return { revenue, cost, count };
}

export function computeDashboardKpis(
  daily: DailySales[],
  today: string,
  monthExpenses: number,
): DashboardKpis {
  const yesterday = addDays(today, -1);
  const monthStart = startOfMonth(today);
  const prevMonthStart = addMonths(today, -1);
  // Mismo tramo del mes anterior (recortado si ese mes es más corto).
  const span = Math.min(dayOfMonth(today), daysInMonth(prevMonthStart));
  const prevMonthEnd = addDays(prevMonthStart, span - 1);

  const t = sumRange(daily, today, today);
  const y = sumRange(daily, yesterday, yesterday);
  const cur = sumRange(daily, monthStart, today);
  const prev = sumRange(daily, prevMonthStart, prevMonthEnd);

  const curProfit = cur.revenue - cur.cost;
  const prevProfit = prev.revenue - prev.cost;
  const curMargin = cur.revenue > 0 ? (curProfit / cur.revenue) * 100 : 0;
  const prevMargin = prev.revenue > 0 ? (prevProfit / prev.revenue) * 100 : 0;

  return {
    todayRevenue: kpi(t.revenue, y.revenue),
    monthRevenue: kpi(cur.revenue, prev.revenue),
    grossProfit: kpi(curProfit, prevProfit),
    salesCount: kpi(cur.count, prev.count),
    avgTicket: kpi(
      cur.count > 0 ? cur.revenue / cur.count : 0,
      prev.count > 0 ? prev.revenue / prev.count : 0,
    ),
    marginPct: {
      value: curMargin,
      previous: prevMargin,
      // Para márgenes se informa la diferencia en puntos, no un % de un %.
      changePct: prev.revenue > 0 && cur.revenue > 0 ? curMargin - prevMargin : null,
    },
    netResult: curProfit - monthExpenses,
    monthExpenses,
    periodLabel: `1 al ${dayOfMonth(today)} vs. mismo tramo del mes anterior`,
  };
}

/** Serie para el gráfico: últimos `days` días y los `days` anteriores alineados. */
export function buildComparisonSeries(daily: DailySales[], today: string, days: number) {
  const byDate = new Map(daily.map((d) => [d.date, d.revenue]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    const previousDate = addDays(date, -days);
    return {
      date,
      current: byDate.get(date) ?? 0,
      previous: byDate.get(previousDate) ?? 0,
    };
  });
}
