import "server-only";

import { generateAlerts } from "@/lib/alerts/rules";
import { pctChange } from "@/lib/analytics/kpis";
import type { SessionContext } from "@/lib/auth/session";
import { fetchProductPerformance, fetchSalesByPayment } from "@/lib/data/analytics";
import { fetchDailySales, fetchExpensesSummary, fetchInsights } from "@/lib/data/insights";
import { addDays, addMonths, diffDays, startOfMonth, todayAR, WEEKDAY_NAMES, weekdayOf } from "@/lib/dates";
import {
  estimateStockNeeds,
  forecastSales,
  growthCandidates,
  lowRotation,
  sumForecast,
  type ProductDemand,
} from "@/lib/forecast/forecast";
import { paymentLabel } from "@/lib/format";

/**
 * Herramientas de NEXORA AI.
 *
 * El modelo NUNCA accede a la base ni escribe SQL: solo puede pedir estas
 * funciones de lectura. Cada una corre con la sesión del usuario (RLS) y con
 * el comercio resuelto en el servidor, así que ninguna entrada del modelo
 * —ni un mensaje malicioso— puede cambiar de comercio o modificar datos.
 */

type Ctx = Pick<SessionContext, "supabase" | "org">;

export interface AiTool {
  name: string;
  description: string;
  /** JSON Schema de los parámetros. */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}

const period = {
  desde: { type: "string", description: "Fecha inicial inclusive, formato YYYY-MM-DD." },
  hasta: { type: "string", description: "Fecha final inclusive, formato YYYY-MM-DD." },
};

export const AI_TOOLS: AiTool[] = [
  {
    name: "resumen_ventas",
    description:
      "Totales de ventas de un período: facturación, costo, ganancia bruta, margen, cantidad de ventas, unidades, ticket promedio, mejor y peor día, y comparación contra el período anterior de igual duración.",
    parameters: { type: "object", properties: period, required: ["desde", "hasta"], additionalProperties: false },
  },
  {
    name: "evolucion_ventas",
    description:
      "Serie temporal de facturación y cantidad de ventas. Devuelve datos diarios si el período es de hasta 45 días, o semanales si es más largo. Incluye promedio por día de la semana.",
    parameters: { type: "object", properties: period, required: ["desde", "hasta"], additionalProperties: false },
  },
  {
    name: "rendimiento_productos",
    description:
      "Ranking de productos en un período con unidades, facturación, ganancia bruta y margen. Sirve para saber qué productos generan más ganancia, cuáles venden más o cuáles tienen menor margen.",
    parameters: {
      type: "object",
      properties: {
        ...period,
        orden: {
          type: "string",
          enum: ["ganancia", "facturacion", "unidades", "margen_bajo"],
          description: "Criterio del ranking. margen_bajo lista primero los de menor margen entre los que tuvieron ventas.",
        },
        limite: { type: "integer", minimum: 1, maximum: 25, description: "Cantidad de productos (por defecto 10)." },
      },
      required: ["desde", "hasta", "orden"],
      additionalProperties: false,
    },
  },
  {
    name: "estado_inventario",
    description:
      "Situación actual del stock según las ventas de los últimos 30 días: productos sin stock o por debajo del mínimo, sugerencias de reposición para los próximos 14 días, productos estancados (baja rotación) y productos en crecimiento.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "resumen_gastos",
    description:
      "Gastos de un período agrupados por categoría, con comparación contra el período anterior de igual duración y la relación entre gastos y ganancia bruta.",
    parameters: { type: "object", properties: period, required: ["desde", "hasta"], additionalProperties: false },
  },
  {
    name: "metodos_de_pago",
    description: "Facturación y cantidad de ventas por método de pago en un período.",
    parameters: { type: "object", properties: period, required: ["desde", "hasta"], additionalProperties: false },
  },
  {
    name: "prediccion_ventas",
    description:
      "Estimación estadística de facturación para los próximos días (media móvil, tendencia con estacionalidad o Holt-Winters según la historia disponible). Devuelve total estimado, rango probable del 80 %, tendencia y error del modelo. Indica si no hay datos suficientes.",
    parameters: {
      type: "object",
      properties: { dias: { type: "integer", enum: [7, 14, 30], description: "Horizonte de la estimación." } },
      required: ["dias"],
      additionalProperties: false,
    },
  },
  {
    name: "alertas_activas",
    description:
      "Alertas vigentes del comercio generadas por reglas: stock crítico, reposición, productos sin movimiento, caída de ventas, gastos elevados y margen reducido.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const round = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Valida el rango que pidió el modelo; lo acota a hoy y a 366 días. */
function readPeriod(input: Record<string, unknown>, today: string) {
  const desde = String(input.desde ?? "");
  const hasta = String(input.hasta ?? "");
  if (!ISO.test(desde) || !ISO.test(hasta) || Number.isNaN(Date.parse(desde)) || Number.isNaN(Date.parse(hasta))) {
    throw new Error("Las fechas deben tener formato YYYY-MM-DD.");
  }
  const to = hasta > today ? today : hasta;
  if (desde > to) throw new Error("La fecha inicial es posterior a la final o a hoy.");
  const from = diffDays(desde, to) > 365 ? addDays(to, -365) : desde;
  const days = diffDays(from, to) + 1;
  const prevTo = addDays(from, -1);
  return { from, to, days, prevFrom: addDays(prevTo, -(days - 1)), prevTo };
}

function totals(daily: { revenue: number; cost: number; sales_count: number; units: number }[]) {
  const t = daily.reduce(
    (a, d) => ({
      revenue: a.revenue + d.revenue,
      cost: a.cost + d.cost,
      sales: a.sales + d.sales_count,
      units: a.units + d.units,
    }),
    { revenue: 0, cost: 0, sales: 0, units: 0 },
  );
  return {
    facturacion: round(t.revenue),
    costo_mercaderia: round(t.cost),
    ganancia_bruta: round(t.revenue - t.cost),
    margen_bruto_pct: t.revenue > 0 ? round1(((t.revenue - t.cost) / t.revenue) * 100) : null,
    cantidad_ventas: t.sales,
    unidades: t.units,
    ticket_promedio: t.sales > 0 ? round(t.revenue / t.sales) : null,
  };
}

const change = (current: number, previous: number) => {
  const c = pctChange(current, previous);
  return c === null ? null : round1(c);
};

async function runUnsafe(ctx: Ctx, name: string, input: Record<string, unknown>): Promise<unknown> {
  const today = todayAR();

  switch (name) {
    case "resumen_ventas": {
      const p = readPeriod(input, today);
      const [cur, prev] = await Promise.all([
        fetchDailySales(ctx, p.from, p.to),
        fetchDailySales(ctx, p.prevFrom, p.prevTo),
      ]);
      const a = totals(cur);
      const b = totals(prev);
      const withSales = cur.filter((d) => d.sales_count > 0);
      const best = [...withSales].sort((x, y) => y.revenue - x.revenue)[0];
      const worst = [...withSales].sort((x, y) => x.revenue - y.revenue)[0];
      return {
        periodo: { desde: p.from, hasta: p.to, dias: p.days, incluye_hoy_dia_incompleto: p.to === today },
        ...a,
        dias_con_ventas: withSales.length,
        mejor_dia: best ? { fecha: best.date, facturacion: round(best.revenue) } : null,
        peor_dia_con_ventas: worst ? { fecha: worst.date, facturacion: round(worst.revenue) } : null,
        periodo_anterior: { desde: p.prevFrom, hasta: p.prevTo, ...b },
        variacion_pct: {
          facturacion: change(a.facturacion, b.facturacion),
          ganancia_bruta: change(a.ganancia_bruta, b.ganancia_bruta),
          cantidad_ventas: change(a.cantidad_ventas, b.cantidad_ventas),
        },
      };
    }

    case "evolucion_ventas": {
      const p = readPeriod(input, today);
      const daily = await fetchDailySales(ctx, p.from, p.to);
      const byWeekday = Array.from({ length: 7 }, () => ({ revenue: 0, n: 0 }));
      for (const d of daily) {
        const w = byWeekday[weekdayOf(d.date)];
        w.revenue += d.revenue;
        w.n += 1;
      }
      const serie =
        p.days <= 45
          ? daily.map((d) => ({ fecha: d.date, facturacion: round(d.revenue), ventas: d.sales_count }))
          : daily.reduce<{ semana_desde: string; facturacion: number; ventas: number }[]>((acc, d, i) => {
              if (i % 7 === 0) acc.push({ semana_desde: d.date, facturacion: 0, ventas: 0 });
              const last = acc[acc.length - 1];
              last.facturacion += round(d.revenue);
              last.ventas += d.sales_count;
              return acc;
            }, []);
      return {
        periodo: { desde: p.from, hasta: p.to, dias: p.days },
        granularidad: p.days <= 45 ? "diaria" : "semanal (bloques de 7 días desde la fecha inicial)",
        serie,
        promedio_por_dia_de_semana: byWeekday.map((w, i) => ({
          dia: WEEKDAY_NAMES[i],
          facturacion_promedio: w.n > 0 ? round(w.revenue / w.n) : null,
        })),
      };
    }

    case "rendimiento_productos": {
      const p = readPeriod(input, today);
      const limit = Math.min(25, Math.max(1, Number(input.limite) || 10));
      const sold = (await fetchProductPerformance(ctx, p.from, p.to)).filter((x) => x.units > 0);
      const margin = (x: { profit: number; revenue: number }) => (x.revenue > 0 ? (x.profit / x.revenue) * 100 : 0);
      const order = String(input.orden);
      const sorted = [...sold].sort((x, y) =>
        order === "facturacion"
          ? y.revenue - x.revenue
          : order === "unidades"
            ? y.units - x.units
            : order === "margen_bajo"
              ? margin(x) - margin(y)
              : y.profit - x.profit,
      );
      const totalRevenue = sold.reduce((acc, x) => acc + x.revenue, 0);
      return {
        periodo: { desde: p.from, hasta: p.to, dias: p.days },
        orden: order,
        productos_con_ventas: sold.length,
        productos: sorted.slice(0, limit).map((x) => ({
          nombre: x.name,
          sku: x.sku,
          categoria: x.category,
          unidades: x.units,
          facturacion: round(x.revenue),
          ganancia_bruta: round(x.profit),
          margen_pct: round1(margin(x)),
          participacion_en_facturacion_pct: totalRevenue > 0 ? round1((x.revenue / totalRevenue) * 100) : null,
          stock_actual: x.stock,
        })),
      };
    }

    case "estado_inventario": {
      const insights = await fetchInsights(ctx, 30);
      const demand: ProductDemand[] = insights.map((x) => ({
        id: x.id,
        name: x.name,
        sku: x.sku,
        stock: x.stock,
        unitsWindow: x.units_window,
        unitsPrevWindow: x.units_prev_window,
      }));
      const low = insights.filter((x) => x.stock <= x.min_stock);
      return {
        productos_activos: insights.length,
        valor_stock_a_costo: round(insights.reduce((a, x) => a + x.stock * x.cost_price, 0)),
        sin_stock: low.filter((x) => x.stock === 0).map((x) => ({ nombre: x.name, sku: x.sku, unidades_vendidas_30d: x.units_window })),
        bajo_minimo: low
          .filter((x) => x.stock > 0)
          .map((x) => ({ nombre: x.name, sku: x.sku, stock: x.stock, stock_minimo: x.min_stock, unidades_vendidas_30d: x.units_window })),
        reposicion_sugerida_14_dias: estimateStockNeeds(demand, 30, 14)
          .slice(0, 15)
          .map((n) => ({
            nombre: n.name,
            stock: n.stock,
            venta_diaria_promedio: n.dailyRate,
            dias_de_cobertura: n.coverageDays,
            unidades_a_pedir: n.suggestedOrder,
          })),
        estancados_baja_rotacion: lowRotation(demand, 30)
          .slice(0, 15)
          .map((x) => {
            const full = insights.find((i) => i.id === x.id);
            return {
              nombre: x.name,
              stock: x.stock,
              unidades_vendidas_30d: x.unitsWindow,
              capital_inmovilizado: full ? round(full.stock * full.cost_price) : null,
              ultima_venta: full?.last_sale_at ? full.last_sale_at.slice(0, 10) : null,
            };
          }),
        en_crecimiento: growthCandidates(demand)
          .slice(0, 10)
          .map((g) => ({ nombre: g.name, unidades_30d: g.unitsWindow, unidades_30d_previos: g.unitsPrevWindow, variacion_pct: g.changePct })),
        nota: "Las sugerencias suponen que el ritmo de venta de los últimos 30 días se mantiene.",
      };
    }

    case "resumen_gastos": {
      const p = readPeriod(input, today);
      const [cur, prev, daily] = await Promise.all([
        fetchExpensesSummary(ctx, p.from, p.to),
        fetchExpensesSummary(ctx, p.prevFrom, p.prevTo),
        fetchDailySales(ctx, p.from, p.to),
      ]);
      const prevBy = new Map(prev.map((e) => [e.category, e.total]));
      const total = cur.reduce((a, e) => a + e.total, 0);
      const prevTotal = prev.reduce((a, e) => a + e.total, 0);
      const t = totals(daily);
      return {
        periodo: { desde: p.from, hasta: p.to, dias: p.days },
        total_gastos: round(total),
        total_periodo_anterior: round(prevTotal),
        variacion_pct: change(total, prevTotal),
        por_categoria: cur.map((e) => ({
          categoria: e.category,
          total: round(e.total),
          registros: e.items,
          participacion_pct: total > 0 ? round1((e.total / total) * 100) : null,
          periodo_anterior: round(prevBy.get(e.category) ?? 0),
          variacion_pct: change(e.total, prevBy.get(e.category) ?? 0),
        })),
        ganancia_bruta_del_periodo: t.ganancia_bruta,
        resultado_neto_estimado: t.ganancia_bruta - round(total),
        nota: "Los gastos mensuales (alquiler, sueldos) se registran en una fecha puntual: comparar períodos cortos puede distorsionar la variación.",
      };
    }

    case "metodos_de_pago": {
      const p = readPeriod(input, today);
      const rows = await fetchSalesByPayment(ctx, p.from, p.to);
      const total = rows.reduce((a, r) => a + r.revenue, 0);
      return {
        periodo: { desde: p.from, hasta: p.to, dias: p.days },
        metodos: rows.map((r) => ({
          metodo: paymentLabel(r.payment_method),
          facturacion: round(r.revenue),
          ventas: r.sales_count,
          participacion_pct: total > 0 ? round1((r.revenue / total) * 100) : null,
        })),
      };
    }

    case "prediccion_ventas": {
      const days = [7, 14, 30].includes(Number(input.dias)) ? Number(input.dias) : 14;
      const yesterday = addDays(today, -1);
      const daily = await fetchDailySales(ctx, addDays(yesterday, -179), yesterday);
      // La historia empieza en la primera venta: los ceros previos no son información.
      const first = daily.findIndex((d) => d.sales_count > 0);
      const series = (first === -1 ? [] : daily.slice(first)).map((d) => ({ date: d.date, value: d.revenue }));
      const f = forecastSales(series, 30);
      if (!f.sufficient) {
        return { datos_suficientes: false, dias_de_historia: f.historyDays, motivo: f.message };
      }
      const sum = sumForecast(f.points, days);
      const lastActual = series.slice(-days).reduce((a, d) => a + d.value, 0);
      return {
        datos_suficientes: true,
        horizonte_dias: days,
        desde: f.points[0]?.date,
        hasta: f.points[days - 1]?.date,
        facturacion_estimada: round(sum.total),
        rango_probable_80pct: { minimo: round(sum.lower), maximo: round(sum.upper) },
        facturacion_real_ultimos_dias_equivalentes: round(lastActual),
        metodo: f.methodLabel,
        dias_de_historia: f.historyDays,
        tendencia: f.trend ? { direccion: f.trend.direction, variacion_semanal_pct: f.trend.weeklyChangePct } : null,
        error_del_modelo: f.accuracy
          ? { error_porcentual_medio: f.accuracy.mape, dias_evaluados: f.accuracy.holdoutDays }
          : null,
        advertencia:
          "Es una estimación estadística basada en el historial; no contempla feriados, promociones, clima ni cambios de precios.",
      };
    }

    case "alertas_activas": {
      const monthStart = startOfMonth(today);
      const [insights, daily, expensesCurrent, expensesPrevious] = await Promise.all([
        fetchInsights(ctx, 30),
        fetchDailySales(ctx, addDays(today, -15), today),
        fetchExpensesSummary(ctx, monthStart, today),
        fetchExpensesSummary(ctx, addMonths(today, -3), addDays(monthStart, -1)),
      ]);
      const alerts = generateAlerts({
        today,
        windowDays: 30,
        products: insights,
        daily: daily.map((d) => ({ date: d.date, revenue: d.revenue })),
        expensesCurrent: expensesCurrent.map((e) => ({ category: e.category, total: e.total })),
        expensesBaseline: expensesPrevious.map((e) => ({ category: e.category, monthlyAvg: e.total / 3 })),
      });
      return {
        total: alerts.length,
        alertas: alerts.slice(0, 30).map((a) => ({
          severidad: a.severity === "critical" ? "crítica" : a.severity === "warning" ? "advertencia" : "informativa",
          titulo: a.title,
          detalle: a.description,
          regla: a.rule,
        })),
      };
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

/** Ejecuta una herramienta y devuelve SIEMPRE un JSON serializable (también ante errores). */
export async function runAiTool(ctx: Ctx, name: string, input: unknown): Promise<string> {
  try {
    const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    return JSON.stringify(await runUnsafe(ctx, name, args));
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : "No se pudo consultar la información.",
    });
  }
}
