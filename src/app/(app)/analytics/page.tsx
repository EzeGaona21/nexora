import { Banknote, ChartNoAxesColumn, Percent, Receipt, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";

import { BarsChart, RevenueProfitChart } from "@/components/charts/analytics-charts";
import { LegendDot } from "@/components/charts/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GrowBar, Stagger, StaggerItem } from "@/components/motion/primitives";
import { PeriodFilter } from "@/components/ui/period-filter";
import { Badge, Card, CardHeader, EmptyState, PageHeader, TableShell, td, th } from "@/components/ui/primitives";
import { abcClassification, categoryBreakdown, weekdayAverages } from "@/lib/analytics/breakdowns";
import { pctChange } from "@/lib/analytics/kpis";
import { getSessionContext } from "@/lib/auth/session";
import { fetchProductPerformance, fetchSalesByHour, fetchSalesByPayment } from "@/lib/data/analytics";
import { fetchDailySales } from "@/lib/data/insights";
import { todayAR, WEEKDAY_NAMES } from "@/lib/dates";
import { formatARS, formatNumber, formatPct, paymentLabel } from "@/lib/format";
import { previousPeriod, resolvePeriod } from "@/lib/period";
import { formatDateAR } from "@/lib/reports/cells";

export const metadata: Metadata = { title: "Analytics" };

function sum(daily: { revenue: number; cost: number; sales_count: number }[]) {
  const revenue = daily.reduce((a, d) => a + d.revenue, 0);
  const cost = daily.reduce((a, d) => a + d.cost, 0);
  const count = daily.reduce((a, d) => a + d.sales_count, 0);
  return {
    revenue,
    profit: revenue - cost,
    count,
    ticket: count > 0 ? revenue / count : 0,
    margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
  };
}

const ABC_TONE = { A: "brand", B: "info", C: "neutral" } as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>;
}) {
  const ctx = await getSessionContext();
  const today = todayAR();
  const period = resolvePeriod(await searchParams, today);
  const prev = previousPeriod(period);

  const [daily, prevDaily, byPayment, byHour, performance] = await Promise.all([
    fetchDailySales(ctx, period.from, period.to),
    fetchDailySales(ctx, prev.from, prev.to),
    fetchSalesByPayment(ctx, period.from, period.to),
    fetchSalesByHour(ctx, period.from, period.to),
    fetchProductPerformance(ctx, period.from, period.to),
  ]);

  const cur = sum(daily);
  const old = sum(prevDaily);
  const caption = "vs. período anterior";

  const weekdays = weekdayAverages(daily);
  const categories = categoryBreakdown(performance);
  const abc = abcClassification(performance);
  const classA = abc.filter((x) => x.class === "A").length;
  const paymentTotal = byPayment.reduce((a, p) => a + p.revenue, 0);
  const hours = byHour.length
    ? Array.from({ length: byHour[byHour.length - 1].hour - byHour[0].hour + 1 }, (_, i) => {
        const hour = byHour[0].hour + i;
        return { label: `${hour} h`, value: byHour.find((h) => h.hour === hour)?.revenue ?? 0 };
      })
    : [];
  const bestWeekday = [...weekdays].sort((a, b) => b.average - a.average)[0];
  const bestHour = [...hours].sort((a, b) => b.value - a.value)[0];

  const header = (
    <>
      <PageHeader
        title="Analytics"
        description={`${formatDateAR(period.from)} al ${formatDateAR(period.to)} · ${period.days} ${period.days === 1 ? "día" : "días"}`}
      />
      <div className="mb-6">
        <PeriodFilter period={period} today={today} />
      </div>
    </>
  );

  if (cur.count === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<ChartNoAxesColumn />}
            title="No hay ventas en este período"
            description="Elegí otro rango de fechas o registrá ventas para ver el análisis."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      {header}

      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StaggerItem>
          <KpiCard label="Facturación" value={cur.revenue} format="ars" change={pctChange(cur.revenue, old.revenue)} caption={caption} icon={<Banknote />} />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="Ganancia bruta" value={cur.profit} format="ars" change={pctChange(cur.profit, old.profit)} caption={caption} icon={<ChartNoAxesColumn />} />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Margen bruto"
            value={cur.margin}
            format="pct"
            change={old.revenue > 0 ? cur.margin - old.margin : null}
            changeUnit="pp"
            caption={caption}
            icon={<Percent />}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="Ventas" value={cur.count} format="number" change={pctChange(cur.count, old.count)} caption={caption} icon={<ShoppingBag />} />
        </StaggerItem>
        <StaggerItem className="col-span-2 xl:col-span-1">
          <KpiCard label="Ticket promedio" value={cur.ticket} format="ars" change={pctChange(cur.ticket, old.ticket)} caption={caption} icon={<Receipt />} />
        </StaggerItem>
      </Stagger>

      <Card className="mt-4">
        <CardHeader
          title="Facturación y ganancia"
          description="Ganancia bruta = facturación menos costo de la mercadería vendida"
          action={
            <div className="hidden items-center gap-4 sm:flex">
              <LegendDot color="#8B5CF6" label="Facturación" />
              <LegendDot color="#F8FAFC" label="Ganancia bruta" />
            </div>
          }
        />
        <div className="p-3 pt-4 sm:p-5">
          <RevenueProfitChart data={daily.map((d) => ({ date: d.date, revenue: d.revenue, profit: d.revenue - d.cost }))} />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Por día de la semana"
            description={
              bestWeekday && bestWeekday.average > 0
                ? `Facturación promedio · el mejor día es ${WEEKDAY_NAMES[bestWeekday.weekday].toLowerCase()}`
                : "Facturación promedio"
            }
          />
          <div className="p-3 pt-4 sm:p-5">
            <BarsChart
              data={weekdays.map((w) => ({ label: WEEKDAY_NAMES[w.weekday].slice(0, 3), value: Math.round(w.average) }))}
              seriesName="Promedio diario"
              ariaLabel="Gráfico de facturación promedio por día de la semana"
            />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Por franja horaria"
            description={bestHour ? `Facturación acumulada · pico a las ${bestHour.label}` : "Facturación acumulada"}
          />
          <div className="p-3 pt-4 sm:p-5">
            <BarsChart data={hours} seriesName="Facturación" ariaLabel="Gráfico de facturación por hora del día" />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Categorías" description="Participación en la facturación y margen de cada una" />
          <ul className="flex flex-col gap-4 p-5">
            {categories.map((c) => (
              <li key={c.category}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-fg">{c.category}</span>
                  <span className="shrink-0 text-xs text-subtle">
                    margen <span className="num text-muted">{formatPct(c.margin)}</span>
                    <span className="num ml-3 text-sm font-medium text-fg">{formatARS(c.revenue)}</span>
                  </span>
                </div>
                <GrowBar ratio={c.share / (categories[0]?.share || 1)} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Métodos de pago" description="Cómo te pagaron en el período" />
          <ul className="flex flex-col gap-4 p-5">
            {byPayment.map((p) => (
              <li key={p.payment_method}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-fg">{paymentLabel(p.payment_method)}</span>
                  <span className="shrink-0 text-xs text-subtle">
                    <span className="num text-muted">{formatNumber(p.sales_count)}</span> ventas ·{" "}
                    <span className="num text-muted">{formatPct(paymentTotal > 0 ? (p.revenue / paymentTotal) * 100 : 0)}</span>
                    <span className="num ml-3 text-sm font-medium text-fg">{formatARS(p.revenue)}</span>
                  </span>
                </div>
                <GrowBar ratio={p.revenue / (byPayment[0]?.revenue || 1)} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Concentración de ventas (ABC)"
          description={`${classA} de ${abc.length} productos explican el 80 % de la facturación. Son los que no pueden faltar.`}
        />
        <div className="mt-4">
          <TableShell>
            <thead>
              <tr className="border-y border-border">
                <th className={th}>Producto</th>
                <th className={th}>Clase</th>
                <th className={`${th} text-right`}>Unidades</th>
                <th className={`${th} text-right`}>Facturación</th>
                <th className={`${th} text-right`}>Margen</th>
                <th className={`${th} text-right`}>Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {abc.slice(0, 15).map(({ item, class: cls, cumulativeShare }) => (
                <tr key={item.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-raised/40">
                  <td className={td}>
                    <span className="block max-w-[16rem] truncate">{item.name}</span>
                    <span className="num text-xs text-subtle">{item.sku}</span>
                  </td>
                  <td className={td}>
                    <Badge tone={ABC_TONE[cls]}>{cls}</Badge>
                  </td>
                  <td className={`${td} num text-right`}>{formatNumber(item.units)}</td>
                  <td className={`${td} num text-right`}>{formatARS(item.revenue)}</td>
                  <td className={`${td} num text-right text-muted`}>
                    {formatPct(item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0)}
                  </td>
                  <td className={`${td} num text-right text-muted`}>{formatPct(cumulativeShare)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
        {abc.length > 15 ? (
          <p className="border-t border-border px-5 py-3 text-xs text-subtle">
            Se muestran los 15 principales. El detalle completo está en Reportes → Rendimiento de productos.
          </p>
        ) : null}
      </Card>
    </>
  );
}
