import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDays, weekdayOf } from "../src/lib/dates.ts";
import {
  estimateStockNeeds,
  forecastSales,
  growthCandidates,
  linearRegression,
  lowRotation,
  methodFor,
  movingAverage,
  sumForecast,
  weekdayIndices,
  type DailyPoint,
} from "../src/lib/forecast/forecast.ts";

function series(days: number, fn: (i: number, date: string) => number): DailyPoint[] {
  const start = "2026-01-05"; // lunes
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i);
    return { date, value: fn(i, date) };
  });
}

const WEEK_PATTERN = [60, 90, 92, 97, 100, 120, 138]; // domingo … sábado

describe("primitivas estadísticas", () => {
  it("media móvil usa solo la ventana pedida", () => {
    assert.equal(movingAverage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3), 9);
  });

  it("regresión lineal recupera pendiente e intercepto exactos", () => {
    const { slope, intercept } = linearRegression([5, 7, 9, 11, 13]);
    assert.ok(Math.abs(slope - 2) < 1e-9);
    assert.ok(Math.abs(intercept - 5) < 1e-9);
  });

  it("índices por día de semana promedian 1 y detectan el pico", () => {
    const s = series(56, (_, d) => WEEK_PATTERN[weekdayOf(d)]);
    const idx = weekdayIndices(
      s.map((p) => p.value),
      s.map((p) => weekdayOf(p.date)),
    );
    assert.ok(Math.abs(idx.reduce((a, b) => a + b, 0) / 7 - 1) < 1e-9);
    assert.equal(idx.indexOf(Math.max(...idx)), 6);
  });

  it("elige el modelo según la historia disponible", () => {
    assert.equal(methodFor(5), "insufficient");
    assert.equal(methodFor(20), "moving_average");
    assert.equal(methodFor(40), "seasonal_trend");
    assert.equal(methodFor(120), "holt_winters");
  });
});

describe("forecastSales", () => {
  it("no predice con menos de 14 días y lo dice", () => {
    const r = forecastSales(series(9, () => 100), 7);
    assert.equal(r.sufficient, false);
    assert.equal(r.points.length, 0);
    assert.match(r.message ?? "", /al menos 14/);
  });

  it("ignora los días previos a la primera venta", () => {
    const r = forecastSales(series(40, (i) => (i < 30 ? 0 : 100)), 7);
    assert.equal(r.historyDays, 10);
    assert.equal(r.sufficient, false);
  });

  it("serie constante → predicción constante con error nulo", () => {
    const r = forecastSales(series(20, () => 250), 7);
    assert.equal(r.method, "moving_average");
    for (const p of r.points) assert.equal(p.value, 250);
    assert.equal(r.accuracy?.mae, 0);
  });

  it("es determinístico: misma entrada, misma salida", () => {
    const s = series(120, (i, d) => WEEK_PATTERN[weekdayOf(d)] * (1 + i / 400));
    assert.deepEqual(forecastSales(s, 30), forecastSales(s, 30));
  });

  it("Holt-Winters reproduce un patrón semanal estable", () => {
    const s = series(84, (_, d) => WEEK_PATTERN[weekdayOf(d)] * 1000);
    const r = forecastSales(s, 14);
    assert.equal(r.method, "holt_winters");
    for (const p of r.points) {
      const expected = WEEK_PATTERN[weekdayOf(p.date)] * 1000;
      assert.ok(Math.abs(p.value - expected) / expected < 0.03, `${p.date}: ${p.value} vs ${expected}`);
    }
    assert.ok((r.accuracy?.mape ?? 100) < 3);
  });

  it("tendencia + estacionalidad sigue una serie creciente", () => {
    const s = series(42, (i, d) => WEEK_PATTERN[weekdayOf(d)] * (10 + i * 0.1));
    const r = forecastSales(s, 7);
    assert.equal(r.method, "seasonal_trend");
    assert.equal(r.trend?.direction, "up");
    const lastWeek = s.slice(-7).reduce((a, p) => a + p.value, 0);
    const nextWeek = r.points.reduce((a, p) => a + p.value, 0);
    assert.ok(nextWeek > lastWeek);
    assert.ok(nextWeek < lastWeek * 1.2);
  });

  it("nunca predice valores negativos y la banda contiene al valor", () => {
    const s = series(90, (i) => Math.max(0, 500 - i * 8));
    const r = forecastSales(s, 30);
    for (const p of r.points) {
      assert.ok(p.value >= 0 && p.lower >= 0);
      assert.ok(p.lower <= p.value && p.value <= p.upper);
    }
  });

  it("las fechas predichas son consecutivas a partir del último día", () => {
    const s = series(60, () => 100);
    const r = forecastSales(s, 5);
    assert.deepEqual(
      r.points.map((p) => p.date),
      [1, 2, 3, 4, 5].map((i) => addDays(s[59].date, i)),
    );
  });

  it("sumForecast totaliza el horizonte pedido", () => {
    const r = forecastSales(series(20, () => 100), 30);
    assert.equal(sumForecast(r.points, 7).total, 700);
    assert.equal(sumForecast(r.points, 30).total, 3000);
  });
});

describe("lectura por producto", () => {
  const products = [
    { id: "a", name: "A", sku: "A", stock: 5, unitsWindow: 60, unitsPrevWindow: 40 },
    { id: "b", name: "B", sku: "B", stock: 100, unitsWindow: 30, unitsPrevWindow: 30 },
    { id: "c", name: "C", sku: "C", stock: 12, unitsWindow: 1, unitsPrevWindow: 9 },
    { id: "d", name: "D", sku: "D", stock: 0, unitsWindow: 0, unitsPrevWindow: 0 },
  ];

  it("sugiere reposición solo cuando la demanda supera al stock", () => {
    const needs = estimateStockNeeds(products, 30, 14);
    assert.deepEqual(needs.map((n) => n.id), ["a"]);
    assert.equal(needs[0].expectedUnits, 28);
    assert.equal(needs[0].suggestedOrder, 23);
    assert.equal(needs[0].coverageDays, 2);
  });

  it("detecta crecimiento con volumen mínimo", () => {
    const g = growthCandidates(products);
    assert.deepEqual(g.map((p) => p.id), ["a"]);
    assert.equal(g[0].changePct, 50);
  });

  it("baja rotación exige stock disponible", () => {
    assert.deepEqual(lowRotation(products, 30).map((p) => p.id), ["c"]);
  });
});
