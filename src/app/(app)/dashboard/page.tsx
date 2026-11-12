import {
  Banknote,
  CalendarDays,
  PackageCheck,
  Percent,
  Plus,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LegendDot, SalesComparisonChart } from "@/components/charts/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GrowBar, Stagger, StaggerItem } from "@/components/motion/primitives";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { buildComparisonSeries, computeDashboardKpis } from "@/lib/analytics/kpis";
import { getSessionContext } from "@/lib/auth/session";
import { fetchDailySales, fetchExpensesSummary, fetchInsights } from "@/lib/data/insights";
import { addDays, startOfMonth, todayAR } from "@/lib/dates";
import { formatARS, formatLongDay, formatNumber, formatTime, formatDay, paymentLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SaleRow } from "@/types/db";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getSessionContext();
  const today = todayAR();

  const [daily, insights, expenses, recentRes] = await Promise.all([
    fetchDailySales(ctx, addDays(today, -92), today),
    fetchInsights(ctx, 30),
    fetchExpensesSummary(ctx, startOfMonth(today), today),
    ctx.supabase
      .from("sales")
      .select("id, number, status, total, units, payment_method, created_at")
      .eq("org_id", ctx.org.id)
      .order("created_at", { ascending: false })
      .limit(7),
  ]);
  if (recentRes.error) throw new Error(recentRes.error.message);
  const recent = (recentRes.data ?? []) as Pick<
    SaleRow,
    "id" | "number" | "status" | "total" | "units" | "payment_method" | "created_at"
  >[];

  const monthExpenses = expenses.reduce((a, e) => a + e.total, 0);
  const kpis = computeDashboardKpis(daily, today, monthExpenses);
  const series = buildComparisonSeries(daily, today, 30);
  const topProducts = insights.filter((p) => p.revenue_window > 0).slice(0, 5);
  const maxRevenue = topProducts[0]?.revenue_window ?? 0;
  const lowStock = insights
    .filter((p) => p.stock <= p.min_stock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);
  const lowStockTotal = insights.filter((p) => p.stock <= p.min_stock).length;

  const header = (
    <PageHeader
      title={`Hola, ${ctx.user.name.split(" ")[0]}`}
      description={`${formatLongDay(today).replace(/^./, (c) => c.toUpperCase())} · ${ctx.org.name}`}
      actions={
        <Link href="/ventas/nueva" className={buttonVariants()}>
          <Plus aria-hidden />
          Nueva venta
        </Link>
      }
    />
  );

  // Comercio recién creado: en lugar de un tablero en cero, el camino a seguir.
  if (insights.length === 0 && recent.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<PackageCheck />}
            title="Tu comercio está listo para empezar"
            description="Cargá tus primeros productos y registrá una venta. A partir de ahí el dashboard se arma solo con tus datos."
            action={
              <Link href="/productos" className={buttonVariants()}>
                Cargar productos
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      {header}

      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StaggerItem>
          <KpiCard
            label="Facturación de hoy"
            value={kpis.todayRevenue.value}
            format="ars"
            change={kpis.todayRevenue.changePct}
            caption="vs. ayer completo"
            icon={<CalendarDays />}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Facturación del mes"
            value={kpis.monthRevenue.value}
            format="ars"
            change={kpis.monthRevenue.changePct}
            caption="vs. mes anterior"
            icon={<Banknote />}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Ganancia bruta estimada"
            value={kpis.grossProfit.value}
            format="ars"
            change={kpis.grossProfit.changePct}
            caption="ventas − costo"
            icon={<TrendingUp />}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Ventas del mes"
            value={kpis.salesCount.value}
            format="number"
            change={kpis.salesCount.changePct}
            caption="operaciones"
            icon={<ShoppingBag />}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Ticket promedio"
            value={kpis.avgTicket.value}
            format="ars"
            change={kpis.avgTicket.changePct}
            caption="por venta"
            icon={<Receipt />}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Margen de rentabilidad"
            value={kpis.marginPct.value}
            format="pct"
            change={kpis.marginPct.changePct}
            changeUnit="pp"
            caption="sobre facturación"
            icon={<Percent />}
          />
        </StaggerItem>
      </Stagger>
      <p className="mt-2 text-xs text-subtle">
        Comparaciones del mes: días {kpis.periodLabel}.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Evolución de ventas"
            description="Facturación diaria de los últimos 30 días"
            action={
              <div className="hidden items-center gap-4 sm:flex">
                <LegendDot color="#10B981" label="Período actual" />
                <LegendDot color="#64748B" label="30 días anteriores" dashed />
              </div>
            }
          />
          <div className="p-2 pt-4 sm:p-4">
            <SalesComparisonChart data={series} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Resultado del mes" description="Estimado, del día 1 a hoy" />
          <dl className="flex flex-col gap-3 p-5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Ganancia bruta</dt>
              <dd className="num">{formatARS(kpis.grossProfit.value)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Gastos registrados</dt>
              <dd className="num">− {formatARS(kpis.monthExpenses)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <dt className="font-medium">Resultado neto</dt>
              <dd className={cn("num text-lg font-semibold", kpis.netResult < 0 ? "text-danger" : "text-brand-bright")}>
                {formatARS(kpis.netResult)}
              </dd>
            </div>
          </dl>
          <p className="px-5 pb-5 text-xs leading-relaxed text-subtle">
            Los gastos fijos suelen cargarse a principio de mes: el resultado se equilibra a medida
            que avanzan las ventas.
          </p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Productos más vendidos" description="Por facturación, últimos 30 días" />
          {topProducts.length === 0 ? (
            <p className="p-5 text-sm text-muted">Todavía no hay ventas en los últimos 30 días.</p>
          ) : (
            <ul className="flex flex-col gap-4 p-5">
              {topProducts.map((p) => (
                <li key={p.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm">{p.name}</span>
                    <span className="num shrink-0 text-[13px] text-muted">{formatARS(p.revenue_window)}</span>
                  </div>
                  <GrowBar ratio={maxRevenue > 0 ? p.revenue_window / maxRevenue : 0} />
                  <p className="num mt-1 text-xs text-subtle">{formatNumber(p.units_window)} unidades</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Alertas de stock"
            description={
              lowStockTotal === 0
                ? "Ningún producto bajo el mínimo"
                : `${lowStockTotal} ${lowStockTotal === 1 ? "producto" : "productos"} en el mínimo o por debajo`
            }
            action={
              <Link href="/alertas" className="shrink-0 text-[13px] font-medium text-brand hover:text-brand-bright">
                Ver todas
              </Link>
            }
          />
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-muted">Todo el catálogo tiene stock por encima del mínimo.</p>
          ) : (
            <ul className="divide-y divide-border px-5 py-2">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{p.name}</p>
                    <p className="num text-xs text-subtle">Mínimo {p.min_stock}</p>
                  </div>
                  <Badge tone={p.stock === 0 ? "danger" : "warning"}>
                    <span className="num">{p.stock === 0 ? "Sin stock" : `Quedan ${p.stock}`}</span>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Actividad reciente"
            description="Últimas ventas registradas"
            action={
              <Link href="/ventas" className="shrink-0 text-[13px] font-medium text-brand hover:text-brand-bright">
                Historial
              </Link>
            }
          />
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">Todavía no registraste ventas.</p>
          ) : (
            <ul className="divide-y divide-border px-5 py-2">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link href={`/ventas/${s.id}`} className="group flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm group-hover:text-brand-bright">
                        Venta <span className="num">#{s.number}</span>
                        {s.status === "cancelled" ? (
                          <Badge tone="danger" className="ml-2">Cancelada</Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-subtle">
                        {formatDay(todayAR(new Date(s.created_at)))} · {formatTime(s.created_at)} ·{" "}
                        {paymentLabel(s.payment_method)}
                      </p>
                    </div>
                    <span className={cn("num shrink-0 text-sm", s.status === "cancelled" && "text-subtle line-through")}>
                      {formatARS(s.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
