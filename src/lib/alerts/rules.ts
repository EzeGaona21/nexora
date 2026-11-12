/**
 * Centro de alertas — reglas explícitas sobre datos reales.
 * Módulo puro: recibe datos ya consultados y devuelve alertas.
 */

import { diffDays } from "../dates.ts";

export type AlertType =
  | "stock_out"
  | "stock_critical"
  | "restock"
  | "no_movement"
  | "sales_drop"
  | "high_expense"
  | "low_margin";

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  /** Regla que la disparó, legible para el usuario. */
  rule: string;
  productId?: string;
}

export interface ProductInsight {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  stock: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  units_window: number;
  units_prev_window: number;
  revenue_window: number;
  profit_window: number;
  last_sale_at: string | null;
  created_at: string;
}

export interface AlertInput {
  /** Día actual (YYYY-MM-DD, hora de Argentina). */
  today: string;
  windowDays: number;
  products: ProductInsight[];
  /** Facturación diaria ordenada; debe cubrir al menos los 14 días previos a hoy. */
  daily: { date: string; revenue: number }[];
  /** Gastos del mes en curso por categoría. */
  expensesCurrent: { category: string; total: number }[];
  /** Promedio mensual por categoría de los 3 meses anteriores. */
  expensesBaseline: { category: string; monthlyAvg: number }[];
}

export const ALERT_THRESHOLDS = {
  /** Días de cobertura por debajo de los cuales conviene reponer. */
  restockCoverageDays: 7,
  /** Días sin ventas para considerar un producto estancado. */
  noMovementDays: 30,
  /** Caída semanal de facturación que dispara aviso / alerta crítica. */
  salesDropWarning: -0.2,
  salesDropCritical: -0.35,
  /** Margen sobre precio de venta considerado reducido. */
  lowMargin: 0.15,
  /** Gasto de la categoría respecto de su promedio trimestral. */
  expenseRatio: 1.3,
} as const;

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

const ars = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const pct = (n: number) => `${Math.round(Math.abs(n) * 100)} %`;

export function generateAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];
  const T = ALERT_THRESHOLDS;

  for (const p of input.products) {
    const dailyRate = p.units_window / input.windowDays;

    // ── Stock ──
    if (p.stock === 0) {
      alerts.push({
        id: `stock_out:${p.id}`,
        type: "stock_out",
        severity: dailyRate > 0 ? "critical" : "warning",
        title: `Sin stock: ${p.name}`,
        description:
          dailyRate > 0
            ? `Se venían vendiendo ${p.units_window} unidades cada ${input.windowDays} días. Cada día sin stock es venta perdida.`
            : "No quedan unidades disponibles.",
        rule: "Stock disponible igual a 0",
        productId: p.id,
      });
    } else if (p.stock <= p.min_stock) {
      alerts.push({
        id: `stock_critical:${p.id}`,
        type: "stock_critical",
        severity: "critical",
        title: `Stock crítico: ${p.name}`,
        description: `Quedan ${p.stock} unidades y el mínimo configurado es ${p.min_stock}.`,
        rule: "Stock menor o igual al stock mínimo",
        productId: p.id,
      });
    } else if (dailyRate > 0 && p.stock / dailyRate < T.restockCoverageDays) {
      const coverage = Math.floor(p.stock / dailyRate);
      alerts.push({
        id: `restock:${p.id}`,
        type: "restock",
        severity: "warning",
        title: `Conviene reponer: ${p.name}`,
        description: `Al ritmo actual (${dailyRate.toFixed(1)} u/día) las ${p.stock} unidades alcanzan para unos ${coverage} ${coverage === 1 ? "día" : "días"}.`,
        rule: `Cobertura estimada menor a ${T.restockCoverageDays} días`,
        productId: p.id,
      });
    }

    // ── Sin movimiento ──
    const productAge = diffDays(p.created_at.slice(0, 10), input.today);
    const daysSinceSale = p.last_sale_at
      ? diffDays(p.last_sale_at.slice(0, 10), input.today)
      : null;
    if (
      p.stock > 0 &&
      productAge >= T.noMovementDays &&
      (daysSinceSale === null || daysSinceSale >= T.noMovementDays)
    ) {
      const immobilized = p.stock * p.cost_price;
      alerts.push({
        id: `no_movement:${p.id}`,
        type: "no_movement",
        severity: "info",
        title: `Sin movimiento: ${p.name}`,
        description:
          daysSinceSale === null
            ? `Nunca registró ventas y tiene ${ars(immobilized)} inmovilizados en stock.`
            : `Lleva ${daysSinceSale} días sin ventas, con ${ars(immobilized)} inmovilizados en stock.`,
        rule: `Sin ventas en ${T.noMovementDays} días o más, con stock disponible`,
        productId: p.id,
      });
    }

    // ── Margen ──
    if (p.sale_price > 0) {
      const margin = (p.sale_price - p.cost_price) / p.sale_price;
      if (margin < 0) {
        alerts.push({
          id: `low_margin:${p.id}`,
          type: "low_margin",
          severity: "critical",
          title: `Se vende bajo el costo: ${p.name}`,
          description: `El precio (${ars(p.sale_price)}) es menor al costo (${ars(p.cost_price)}). Cada venta genera pérdida.`,
          rule: "Precio de venta menor al precio de compra",
          productId: p.id,
        });
      } else if (margin < T.lowMargin) {
        alerts.push({
          id: `low_margin:${p.id}`,
          type: "low_margin",
          severity: "warning",
          title: `Margen reducido: ${p.name}`,
          description: `Deja un margen de ${pct(margin)} sobre el precio de venta (costo ${ars(p.cost_price)}, precio ${ars(p.sale_price)}).`,
          rule: `Margen menor al ${pct(T.lowMargin)}`,
          productId: p.id,
        });
      }
    }
  }

  // ── Caída de ventas: últimos 7 días completos vs. los 7 anteriores ──
  const complete = input.daily.filter((d) => d.date < input.today);
  if (complete.length >= 14) {
    const last7 = complete.slice(-7).reduce((a, d) => a + d.revenue, 0);
    const prev7 = complete.slice(-14, -7).reduce((a, d) => a + d.revenue, 0);
    if (prev7 > 0) {
      const change = last7 / prev7 - 1;
      if (change <= T.salesDropWarning) {
        alerts.push({
          id: "sales_drop:weekly",
          type: "sales_drop",
          severity: change <= T.salesDropCritical ? "critical" : "warning",
          title: `Las ventas cayeron ${pct(change)} en la última semana`,
          description: `Se facturaron ${ars(last7)} en los últimos 7 días contra ${ars(prev7)} en los 7 anteriores.`,
          rule: `Facturación semanal ${pct(T.salesDropWarning)} o más por debajo de la semana previa`,
        });
      }
    }
  }

  // ── Gastos elevados ──
  const baseline = new Map(input.expensesBaseline.map((b) => [b.category, b.monthlyAvg]));
  for (const e of input.expensesCurrent) {
    const avg = baseline.get(e.category);
    if (avg && avg > 0 && e.total > avg * T.expenseRatio) {
      alerts.push({
        id: `high_expense:${e.category}`,
        type: "high_expense",
        severity: "warning",
        title: `Gasto elevado en ${e.category}`,
        description: `Este mes van ${ars(e.total)}, un ${pct(e.total / avg - 1)} por encima del promedio de los últimos 3 meses (${ars(avg)}).`,
        rule: `Gasto mensual de la categoría mayor a ${T.expenseRatio}× su promedio trimestral`,
      });
    }
  }

  return alerts.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.title.localeCompare(b.title, "es"),
  );
}

export function countBySeverity(alerts: Alert[]): Record<AlertSeverity, number> {
  return alerts.reduce(
    (acc, a) => {
      acc[a.severity] += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0 } as Record<AlertSeverity, number>,
  );
}
