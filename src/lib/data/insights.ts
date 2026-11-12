import "server-only";

import type { ProductInsight } from "@/lib/alerts/rules";
import type { DailySales } from "@/lib/analytics/kpis";
import type { SessionContext } from "@/lib/auth/session";

/**
 * Lecturas analíticas compartidas por dashboard, predicciones y alertas.
 * Todas pasan por funciones SQL con SECURITY INVOKER: RLS filtra por comercio.
 */

type Ctx = Pick<SessionContext, "supabase" | "org">;

function fail(scope: string, message: string): never {
  throw new Error(`No se pudo cargar ${scope}: ${message}`);
}

export async function fetchDailySales(ctx: Ctx, from: string, to: string): Promise<DailySales[]> {
  const { data, error } = await ctx.supabase.rpc("sales_daily", {
    p_org: ctx.org.id,
    p_from: from,
    p_to: to,
  });
  if (error) fail("las ventas diarias", error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    date: String(r.day),
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    sales_count: Number(r.sales_count),
    units: Number(r.units),
  }));
}

export async function fetchInsights(ctx: Ctx, days = 30): Promise<ProductInsight[]> {
  const { data, error } = await ctx.supabase.rpc("inventory_insights", {
    p_org: ctx.org.id,
    p_days: days,
  });
  if (error) fail("el rendimiento de productos", error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    sku: String(r.sku),
    category: r.category ? String(r.category) : null,
    stock: Number(r.stock),
    min_stock: Number(r.min_stock),
    cost_price: Number(r.cost_price),
    sale_price: Number(r.sale_price),
    units_window: Number(r.units_window),
    units_prev_window: Number(r.units_prev_window),
    revenue_window: Number(r.revenue_window),
    profit_window: Number(r.profit_window),
    last_sale_at: r.last_sale_at ? String(r.last_sale_at) : null,
    created_at: String(r.created_at),
  }));
}

export interface ExpenseSummaryRow {
  category: string;
  total: number;
  items: number;
}

export async function fetchExpensesSummary(
  ctx: Ctx,
  from: string,
  to: string,
): Promise<ExpenseSummaryRow[]> {
  const { data, error } = await ctx.supabase.rpc("expenses_summary", {
    p_org: ctx.org.id,
    p_from: from,
    p_to: to,
  });
  if (error) fail("los gastos", error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    category: String(r.category),
    total: Number(r.total),
    items: Number(r.items),
  }));
}
