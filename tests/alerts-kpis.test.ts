import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateAlerts, type AlertInput, type ProductInsight } from "../src/lib/alerts/rules.ts";
import { buildComparisonSeries, computeDashboardKpis, pctChange } from "../src/lib/analytics/kpis.ts";
import { addDays, addMonths, daysInMonth, diffDays, endOfMonth, todayAR } from "../src/lib/dates.ts";

const TODAY = "2026-11-11";

function product(over: Partial<ProductInsight>): ProductInsight {
  return {
    id: "p1",
    name: "Producto",
    sku: "SKU-1",
    category: null,
    stock: 50,
    min_stock: 5,
    cost_price: 600,
    sale_price: 1000,
    units_window: 30,
    units_prev_window: 30,
    revenue_window: 30000,
    profit_window: 12000,
    last_sale_at: `${addDays(TODAY, -1)}T15:00:00Z`,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function input(over: Partial<AlertInput>): AlertInput {
  return {
    today: TODAY,
    windowDays: 30,
    products: [],
    daily: [],
    expensesCurrent: [],
    expensesBaseline: [],
    ...over,
  };
}

const types = (i: AlertInput) => generateAlerts(i).map((a) => a.type);

describe("fechas", () => {
  it("opera sobre días calendario", () => {
    assert.equal(addDays("2026-02-28", 1), "2026-03-01");
    assert.equal(diffDays("2026-10-31", "2026-11-11"), 11);
    assert.equal(addMonths("2026-01-31", -1), "2025-12-01");
    assert.equal(daysInMonth("2028-02-10"), 29);
    assert.equal(endOfMonth("2026-11-11"), "2026-11-30");
  });

  it("usa el día de Argentina aunque en UTC ya sea mañana", () => {
    assert.equal(todayAR(new Date("2026-11-12T01:30:00Z")), "2026-11-11");
  });
});

describe("alertas", () => {
  it("un producto sano no genera alertas", () => {
    assert.deepEqual(types(input({ products: [product({})] })), []);
  });

  it("stock: sin stock, crítico y reposición son excluyentes", () => {
    assert.deepEqual(types(input({ products: [product({ stock: 0 })] })), ["stock_out"]);
    assert.deepEqual(types(input({ products: [product({ stock: 5 })] })), ["stock_critical"]);
    // 6 unidades a 1 u/día = 6 días de cobertura (< 7), por encima del mínimo.
    assert.deepEqual(types(input({ products: [product({ stock: 6 })] })), ["restock"]);
    assert.deepEqual(types(input({ products: [product({ stock: 8 })] })), []);
  });

  it("sin movimiento: 30 días o más sin ventas, con stock", () => {
    const stale = product({ units_window: 0, last_sale_at: `${addDays(TODAY, -45)}T12:00:00Z` });
    assert.deepEqual(types(input({ products: [stale] })), ["no_movement"]);
    const fresh = product({ units_window: 0, last_sale_at: null, created_at: `${addDays(TODAY, -5)}T00:00:00Z` });
    assert.deepEqual(types(input({ products: [fresh] })), []);
  });

  it("margen: reducido bajo 15 %, crítico bajo el costo", () => {
    const low = generateAlerts(input({ products: [product({ cost_price: 900 })] }));
    assert.equal(low[0].type, "low_margin");
    assert.equal(low[0].severity, "warning");
    const loss = generateAlerts(input({ products: [product({ cost_price: 1100 })] }));
    assert.equal(loss[0].severity, "critical");
  });

  it("caída de ventas compara semanas completas e ignora el día en curso", () => {
    const daily = Array.from({ length: 15 }, (_, i) => {
      const date = addDays(TODAY, i - 14);
      const revenue = i < 7 ? 100_000 : i < 14 ? 70_000 : 0; // hoy sin ventas todavía
      return { date, revenue };
    });
    const alerts = generateAlerts(input({ daily }));
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, "sales_drop");
    assert.equal(alerts[0].severity, "warning");
    assert.match(alerts[0].title, /30 %/);
  });

  it("gasto elevado solo si supera 1,3× el promedio trimestral", () => {
    const base = { expensesBaseline: [{ category: "Servicios", monthlyAvg: 100_000 }] };
    assert.deepEqual(
      types(input({ ...base, expensesCurrent: [{ category: "Servicios", total: 125_000 }] })),
      [],
    );
    assert.deepEqual(
      types(input({ ...base, expensesCurrent: [{ category: "Servicios", total: 140_000 }] })),
      ["high_expense"],
    );
  });

  it("ordena por severidad", () => {
    const alerts = generateAlerts(
      input({
        products: [
          product({ id: "a", units_window: 0, last_sale_at: null }),
          product({ id: "b", stock: 2 }),
          product({ id: "c", cost_price: 900 }),
        ],
      }),
    );
    assert.deepEqual(alerts.map((a) => a.severity), ["critical", "warning", "info"]);
  });
});

describe("KPIs del dashboard", () => {
  const daily = Array.from({ length: 60 }, (_, i) => {
    const date = addDays(TODAY, i - 59);
    const isCurrentMonth = date >= "2026-11-01";
    return {
      date,
      revenue: isCurrentMonth ? 120_000 : 100_000,
      cost: isCurrentMonth ? 78_000 : 70_000,
      sales_count: 10,
      units: 25,
    };
  });

  it("pctChange devuelve null sin base de comparación", () => {
    assert.equal(pctChange(100, 0), null);
    assert.equal(pctChange(150, 100), 50);
  });

  it("compara mes a la fecha contra el mismo tramo del mes anterior", () => {
    const k = computeDashboardKpis(daily, TODAY, 300_000);
    assert.equal(k.monthRevenue.value, 11 * 120_000);
    assert.equal(k.monthRevenue.previous, 11 * 100_000);
    assert.ok(Math.abs((k.monthRevenue.changePct ?? 0) - 20) < 1e-9);
    assert.equal(k.salesCount.value, 110);
    assert.equal(k.avgTicket.value, 12_000);
    assert.equal(k.grossProfit.value, 11 * 42_000);
    assert.ok(Math.abs(k.marginPct.value - 35) < 1e-9);
    assert.ok(Math.abs((k.marginPct.changePct ?? 0) - 5) < 1e-9);
    assert.equal(k.netResult, 11 * 42_000 - 300_000);
    assert.equal(k.todayRevenue.value, 120_000);
    assert.equal(k.todayRevenue.previous, 120_000);
  });

  it("la serie comparativa alinea cada día con el del período previo", () => {
    const s = buildComparisonSeries(daily, TODAY, 30);
    assert.equal(s.length, 30);
    assert.equal(s[29].date, TODAY);
    assert.equal(s[29].current, 120_000);
    assert.equal(s[29].previous, 100_000);
  });
});
