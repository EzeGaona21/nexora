import "server-only";

import type { SessionContext } from "@/lib/auth/session";

/**
 * Lecturas analíticas por período arbitrario (Analytics, Reportes y NEXORA AI).
 * Funciones SQL con SECURITY INVOKER: RLS filtra por comercio.
 */

type Ctx = Pick<SessionContext, "supabase" | "org">;

function fail(scope: string, message: string): never {
  throw new Error(`No se pudo cargar ${scope}: ${message}`);
}

export interface PaymentBreakdownRow {
  payment_method: string;
  revenue: number;
  sales_count: number;
}

export async function fetchSalesByPayment(ctx: Ctx, from: string, to: string): Promise<PaymentBreakdownRow[]> {
  const { data, error } = await ctx.supabase.rpc("sales_by_payment", {
    p_org: ctx.org.id,
    p_from: from,
    p_to: to,
  });
  if (error) fail("los métodos de pago", error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    payment_method: String(r.payment_method),
    revenue: Number(r.revenue),
    sales_count: Number(r.sales_count),
  }));
}

export interface HourlyRow {
  hour: number;
  revenue: number;
  sales_count: number;
}

export async function fetchSalesByHour(ctx: Ctx, from: string, to: string): Promise<HourlyRow[]> {
  const { data, error } = await ctx.supabase.rpc("sales_by_hour", {
    p_org: ctx.org.id,
    p_from: from,
    p_to: to,
  });
  if (error) fail("las ventas por hora", error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    hour: Number(r.hour),
    revenue: Number(r.revenue),
    sales_count: Number(r.sales_count),
  }));
}

export interface ProductPerformanceRow {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  units: number;
  revenue: number;
  profit: number;
  stock: number;
  min_stock: number;
  cost_price: number;
  sale_price: number;
  is_active: boolean;
}

export async function fetchProductPerformance(
  ctx: Ctx,
  from: string,
  to: string,
): Promise<ProductPerformanceRow[]> {
  const { data, error } = await ctx.supabase.rpc("product_performance", {
    p_org: ctx.org.id,
    p_from: from,
    p_to: to,
  });
  if (error) fail("el rendimiento de productos", error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    sku: String(r.sku),
    category: r.category ? String(r.category) : null,
    units: Number(r.units),
    revenue: Number(r.revenue),
    profit: Number(r.profit),
    stock: Number(r.stock),
    min_stock: Number(r.min_stock),
    cost_price: Number(r.cost_price),
    sale_price: Number(r.sale_price),
    is_active: Boolean(r.is_active),
  }));
}
