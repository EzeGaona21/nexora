/**
 * Indicadores del dashboard — módulo puro.
 * Compara el período en curso contra el período anterior equivalente:
 * hoy vs. ayer hasta la misma hora, y el mes vs. los mismos días del mes
 * pasado. Para el mes se comparan solo días cerrados: el día de hoy todavía
 * está en curso y, si entrara en la cuenta, la variación siempre daría a la baja.
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

function kpi(value: number, previous: number, compared = value): Kpi {
  return { value, previous, changePct: pctChange(compared, previous) };
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
  /** Facturación de ayer hasta la misma hora que ahora. Sin el dato, se usa ayer completo. */
  yesterdaySoFar?: number,
): DashboardKpis {
  const yesterday = addDays(today, -1);
  const monthStart = startOfMonth(today);
  const prevMonthStart = addMonths(today, -1);
  // Días cerrados del mes (hasta ayer) y el mismo tramo del mes anterior,
  // recortado si ese mes es más corto. El día 1 no hay nada que comparar.
  const closedDays = dayOfMonth(today) - 1;
  const span = Math.min(closedDays, daysInMonth(prevMonthStart));
  const prevMonthEnd = addDays(prevMonthStart, span - 1);

  const t = sumRange(daily, today, today);
  const y = sumRange(daily, yesterday, yesterday);
  const cur = sumRange(daily, monthStart, today);
  const closed = sumRange(daily, monthStart, yesterday);
  const prev = sumRange(daily, prevMonthStart, prevMonthEnd);

  const ticket = (r: { revenue: number; count: number }) => (r.count > 0 ? r.revenue / r.count : 0);
  const margin = (r: { revenue: number; cost: number }) =>
    r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0;

  const curProfit = cur.revenue - cur.cost;
  const prevProfit = prev.revenue - prev.cost;
  const prevMargin = margin(prev);

  return {
    todayRevenue: kpi(t.revenue, yesterdaySoFar ?? y.revenue),
    monthRevenue: kpi(cur.revenue, prev.revenue, closed.revenue),
    grossProfit: kpi(curProfit, prevProfit, closed.revenue - closed.cost),
    salesCount: kpi(cur.count, prev.count, closed.count),
    avgTicket: kpi(ticket(cur), ticket(prev), ticket(closed)),
    marginPct: {
      value: margin(cur),
      previous: prevMargin,
      // Para márgenes se informa la diferencia en puntos, no un % de un %.
      changePct: prev.revenue > 0 && closed.revenue > 0 ? margin(closed) - prevMargin : null,
    },
    netResult: curProfit - monthExpenses,
    monthExpenses,
    periodLabel:
      closedDays > 0
        ? `días 1 al ${closedDays} vs. mismo tramo del mes anterior`
        : "se muestran desde mañana, cuando haya días cerrados",
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
