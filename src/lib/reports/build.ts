import "server-only";

import type { SessionContext } from "@/lib/auth/session";
import { fetchProductPerformance } from "@/lib/data/analytics";
import { fetchDailySales } from "@/lib/data/insights";
import { paymentLabel } from "@/lib/format";
import type { Period } from "@/lib/period";
import { formatDateAR } from "@/lib/reports/cells";
import { REPORT_META, type Report, type ReportType } from "@/lib/reports/types";

type Ctx = Pick<SessionContext, "supabase" | "org">;

/** Tope de filas de detalle por reporte (los totales siempre son completos). */
const MAX_DETAIL_ROWS = 5000;

function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

async function ventas(ctx: Ctx, period: Period) {
  const daily = await fetchDailySales(ctx, period.from, period.to);
  const rows = daily.map((d) => ({
    date: d.date,
    sales: d.sales_count,
    units: d.units,
    revenue: d.revenue,
    cost: d.cost,
    profit: d.revenue - d.cost,
    ticket: d.sales_count > 0 ? d.revenue / d.sales_count : null,
  }));
  const t = daily.reduce(
    (a, d) => ({
      sales: a.sales + d.sales_count,
      units: a.units + d.units,
      revenue: a.revenue + d.revenue,
      cost: a.cost + d.cost,
    }),
    { sales: 0, units: 0, revenue: 0, cost: 0 },
  );
  return {
    columns: [
      { key: "date", label: "Fecha", kind: "date" },
      { key: "sales", label: "Ventas", kind: "int" },
      { key: "units", label: "Unidades", kind: "int" },
      { key: "revenue", label: "Facturación", kind: "money" },
      { key: "cost", label: "Costo", kind: "money" },
      { key: "profit", label: "Ganancia bruta", kind: "money" },
      { key: "ticket", label: "Ticket promedio", kind: "money" },
    ],
    rows,
    totals: {
      sales: t.sales,
      units: t.units,
      revenue: t.revenue,
      cost: t.cost,
      profit: t.revenue - t.cost,
      ticket: t.sales > 0 ? t.revenue / t.sales : null,
    },
    summary: [
      { label: "Facturación", value: t.revenue, kind: "money" },
      { label: "Ventas", value: t.sales, kind: "int" },
      { label: "Ticket promedio", value: t.sales > 0 ? t.revenue / t.sales : 0, kind: "money" },
      { label: "Margen bruto", value: pct(t.revenue - t.cost, t.revenue), kind: "pct" },
    ],
  } satisfies Partial<Report>;
}

async function rentabilidad(ctx: Ctx, period: Period) {
  const perf = (await fetchProductPerformance(ctx, period.from, period.to)).filter((p) => p.units > 0);
  const rows = [...perf]
    .sort((a, b) => b.profit - a.profit)
    .map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      units: p.units,
      revenue: p.revenue,
      profit: p.profit,
      margin: pct(p.profit, p.revenue),
    }));
  const revenue = perf.reduce((a, p) => a + p.revenue, 0);
  const profit = perf.reduce((a, p) => a + p.profit, 0);
  return {
    columns: [
      { key: "name", label: "Producto", kind: "text" },
      { key: "sku", label: "SKU", kind: "text" },
      { key: "category", label: "Categoría", kind: "text" },
      { key: "units", label: "Unidades", kind: "int" },
      { key: "revenue", label: "Facturación", kind: "money" },
      { key: "profit", label: "Ganancia bruta", kind: "money" },
      { key: "margin", label: "Margen", kind: "pct" },
    ],
    rows,
    totals: {
      units: perf.reduce((a, p) => a + p.units, 0),
      revenue,
      profit,
      margin: pct(profit, revenue),
    },
    summary: [
      { label: "Ganancia bruta", value: profit, kind: "money" },
      { label: "Margen bruto", value: pct(profit, revenue), kind: "pct" },
      { label: "Productos vendidos", value: perf.length, kind: "int" },
    ],
  } satisfies Partial<Report>;
}

async function gastos(ctx: Ctx, period: Period) {
  const { data, error } = await ctx.supabase
    .from("expenses")
    .select("category, description, amount, expense_date, payment_method")
    .eq("org_id", ctx.org.id)
    .gte("expense_date", period.from)
    .lte("expense_date", period.to)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_DETAIL_ROWS);
  if (error) throw new Error(`No se pudieron cargar los gastos: ${error.message}`);
  const rows = (data ?? []).map((e) => ({
    date: String(e.expense_date),
    category: String(e.category),
    description: String(e.description),
    payment: paymentLabel(String(e.payment_method)),
    amount: Number(e.amount),
  }));
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const byCategory = new Map<string, number>();
  for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    columns: [
      { key: "date", label: "Fecha", kind: "date" },
      { key: "category", label: "Categoría", kind: "text" },
      { key: "description", label: "Descripción", kind: "text" },
      { key: "payment", label: "Método de pago", kind: "text" },
      { key: "amount", label: "Importe", kind: "money" },
    ],
    rows,
    totals: { amount: total },
    summary: [
      { label: "Total de gastos", value: total, kind: "money" },
      { label: "Registros", value: rows.length, kind: "int" },
      ...(top ? [{ label: `Mayor rubro: ${top[0]}`, value: top[1], kind: "money" as const }] : []),
    ],
  } satisfies Partial<Report>;
}

async function inventario(ctx: Ctx) {
  const { data, error } = await ctx.supabase
    .from("products")
    .select("name, sku, cost_price, sale_price, stock, min_stock, categories (name)")
    .eq("org_id", ctx.org.id)
    .eq("is_active", true)
    .order("name")
    .limit(MAX_DETAIL_ROWS);
  if (error) throw new Error(`No se pudo cargar el inventario: ${error.message}`);
  const rows = (data ?? []).map((p) => {
    const stock = Number(p.stock);
    const min = Number(p.min_stock);
    const category = p.categories as unknown as { name: string } | null;
    return {
      name: String(p.name),
      sku: String(p.sku),
      category: category?.name ?? null,
      stock,
      min_stock: min,
      cost: Number(p.cost_price),
      price: Number(p.sale_price),
      value: stock * Number(p.cost_price),
      status: stock === 0 ? "Sin stock" : stock <= min ? "Reponer" : "Correcto",
    };
  });
  const value = rows.reduce((a, r) => a + r.value, 0);
  return {
    columns: [
      { key: "name", label: "Producto", kind: "text" },
      { key: "sku", label: "SKU", kind: "text" },
      { key: "category", label: "Categoría", kind: "text" },
      { key: "stock", label: "Stock", kind: "int" },
      { key: "min_stock", label: "Mínimo", kind: "int" },
      { key: "cost", label: "Costo", kind: "money" },
      { key: "price", label: "Precio", kind: "money" },
      { key: "value", label: "Valor a costo", kind: "money" },
      { key: "status", label: "Estado", kind: "text" },
    ],
    rows,
    totals: { stock: rows.reduce((a, r) => a + r.stock, 0), value },
    summary: [
      { label: "Valor del stock a costo", value, kind: "money" },
      { label: "Productos activos", value: rows.length, kind: "int" },
      { label: "Para reponer", value: rows.filter((r) => r.status !== "Correcto").length, kind: "int" },
    ],
  } satisfies Partial<Report>;
}

async function productos(ctx: Ctx, period: Period) {
  const perf = await fetchProductPerformance(ctx, period.from, period.to);
  const revenue = perf.reduce((a, p) => a + p.revenue, 0);
  const rows = perf.map((p) => {
    const perDay = p.units / period.days;
    return {
      name: p.is_active ? p.name : `${p.name} (archivado)`,
      sku: p.sku,
      category: p.category,
      units: p.units,
      revenue: p.revenue,
      share: pct(p.revenue, revenue),
      stock: p.stock,
      // Días que dura el stock al ritmo de venta del período.
      coverage: perDay > 0 ? Math.round(p.stock / perDay) : null,
    };
  });
  return {
    columns: [
      { key: "name", label: "Producto", kind: "text" },
      { key: "sku", label: "SKU", kind: "text" },
      { key: "category", label: "Categoría", kind: "text" },
      { key: "units", label: "Unidades", kind: "int" },
      { key: "revenue", label: "Facturación", kind: "money" },
      { key: "share", label: "Participación", kind: "pct" },
      { key: "stock", label: "Stock", kind: "int" },
      { key: "coverage", label: "Cobertura (días)", kind: "int" },
    ],
    rows,
    totals: { units: perf.reduce((a, p) => a + p.units, 0), revenue },
    summary: [
      { label: "Facturación por productos", value: revenue, kind: "money" },
      { label: "Con ventas", value: perf.filter((p) => p.units > 0).length, kind: "int" },
      { label: "Sin ventas", value: perf.filter((p) => p.units === 0).length, kind: "int" },
    ],
  } satisfies Partial<Report>;
}

export async function buildReport(ctx: Ctx, type: ReportType, period: Period, today: string): Promise<Report> {
  const meta = REPORT_META[type];
  const body =
    type === "ventas"
      ? await ventas(ctx, period)
      : type === "rentabilidad"
        ? await rentabilidad(ctx, period)
        : type === "gastos"
          ? await gastos(ctx, period)
          : type === "inventario"
            ? await inventario(ctx)
            : await productos(ctx, period);

  return {
    type,
    title: meta.title,
    orgName: ctx.org.name,
    periodLabel: meta.usesPeriod
      ? `${formatDateAR(period.from)} al ${formatDateAR(period.to)}`
      : `Stock al ${formatDateAR(today)}`,
    ...body,
  } as Report;
}
