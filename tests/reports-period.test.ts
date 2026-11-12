import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { abcClassification, categoryBreakdown, weekdayAverages } from "../src/lib/analytics/breakdowns.ts";
import { previousPeriod, resolvePeriod } from "../src/lib/period.ts";
import { formatCell } from "../src/lib/reports/cells.ts";
import { escapeCsvText, reportToCsv } from "../src/lib/reports/csv.ts";
import type { Report } from "../src/lib/reports/types.ts";

const TODAY = "2026-11-11";

describe("resolvePeriod", () => {
  it("usa 30 días por defecto, terminando hoy", () => {
    const p = resolvePeriod({}, TODAY);
    assert.deepEqual(p, { from: "2026-10-13", to: TODAY, days: 30, preset: "30" });
  });

  it("resuelve 'este mes' desde el día 1", () => {
    const p = resolvePeriod({ rango: "mes" }, TODAY);
    assert.equal(p.from, "2026-11-01");
    assert.equal(p.days, 11);
  });

  it("acepta un rango propio y lo recorta a hoy", () => {
    const p = resolvePeriod({ desde: "2026-11-01", hasta: "2027-01-31" }, TODAY);
    assert.deepEqual(p, { from: "2026-11-01", to: TODAY, days: 11, preset: "custom" });
  });

  it("ignora fechas inválidas o inexistentes", () => {
    assert.equal(resolvePeriod({ desde: "2026-02-31", hasta: "2026-03-10" }, TODAY).preset, "30");
    assert.equal(resolvePeriod({ desde: "'; drop table", hasta: "2026-03-10" }, TODAY).preset, "30");
  });

  it("limita el rango a 366 días", () => {
    const p = resolvePeriod({ desde: "2020-01-01", hasta: TODAY }, TODAY);
    assert.equal(p.days, 366);
    assert.equal(p.to, TODAY);
  });

  it("corrige un rango invertido", () => {
    const p = resolvePeriod({ desde: "2026-11-10", hasta: "2026-11-05" }, TODAY);
    assert.equal(p.from, "2026-11-05");
    assert.equal(p.days, 1);
  });

  it("calcula el período anterior contiguo y de igual duración", () => {
    const p = resolvePeriod({ rango: "7" }, TODAY);
    assert.deepEqual(previousPeriod(p), { from: "2026-10-29", to: "2026-11-04" });
  });
});

describe("CSV", () => {
  const report: Report = {
    type: "gastos",
    title: "Gastos",
    orgName: 'Almacén "Don Julio"',
    periodLabel: "1/11/2026 al 11/11/2026",
    columns: [
      { key: "date", label: "Fecha", kind: "date" },
      { key: "description", label: "Descripción", kind: "text" },
      { key: "amount", label: "Importe", kind: "money" },
      { key: "items", label: "Registros", kind: "int" },
    ],
    rows: [
      { date: "2026-11-03", description: "Luz; factura de octubre", amount: 166300.5, items: 1 },
      { date: "2026-11-04", description: "=HYPERLINK(\"http://x\")", amount: 78000, items: null },
    ],
    totals: { amount: 244300.5 },
    summary: [],
  };

  it("neutraliza fórmulas y escapa separadores y comillas", () => {
    assert.equal(escapeCsvText("=1+1"), "'=1+1");
    assert.equal(escapeCsvText("-5 unidades"), "'-5 unidades");
    assert.equal(escapeCsvText("a;b"), '"a;b"');
    assert.equal(escapeCsvText('dijo "hola"'), '"dijo ""hola"""');
    assert.equal(escapeCsvText("Yerba mate 1 kg"), "Yerba mate 1 kg");
  });

  it("genera filas con coma decimal, BOM y fila de totales", () => {
    const csv = reportToCsv(report);
    assert.ok(csv.startsWith("﻿"));
    const lines = csv.slice(1).trimEnd().split("\r\n");
    assert.equal(lines[1], '"Almacén ""Don Julio"""');
    assert.equal(lines[4], "Fecha;Descripción;Importe;Registros");
    assert.equal(lines[5], '3/11/2026;"Luz; factura de octubre";166300,50;1');
    assert.equal(lines[6], "4/11/2026;\"'=HYPERLINK(\"\"http://x\"\")\";78000,00;");
    assert.equal(lines[7], "Total;;244300,50;");
  });

  it("formatea celdas para pantalla", () => {
    assert.equal(formatCell(1234567.4, "money"), "$ 1.234.567");
    assert.equal(formatCell(12.34, "pct"), "12,3 %");
    assert.equal(formatCell("2026-01-09", "date"), "9/1/2026");
    assert.equal(formatCell(null, "int"), "—");
  });
});

describe("desgloses de analytics", () => {
  it("promedia por día de semana de lunes a domingo", () => {
    // 2026-11-02 es lunes.
    const out = weekdayAverages([
      { date: "2026-11-02", revenue: 100 },
      { date: "2026-11-09", revenue: 300 },
      { date: "2026-11-08", revenue: 50 },
    ]);
    assert.deepEqual(out.map((w) => w.weekday), [1, 2, 3, 4, 5, 6, 0]);
    assert.equal(out[0].average, 200);
    assert.equal(out[6].average, 50);
    assert.equal(out[1].average, 0);
  });

  it("agrupa por categoría con participación y margen", () => {
    const out = categoryBreakdown([
      { category: "Bebidas", revenue: 600, profit: 150, units: 6 },
      { category: "Bebidas", revenue: 200, profit: 50, units: 2 },
      { category: null, revenue: 200, profit: 100, units: 1 },
      { category: "Limpieza", revenue: 0, profit: 0, units: 0 },
    ]);
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], { category: "Bebidas", revenue: 800, profit: 200, units: 8, share: 80, margin: 25 });
    assert.equal(out[1].category, "Sin categoría");
    assert.equal(out[1].share, 20);
  });

  it("clasifica ABC por facturación acumulada", () => {
    const out = abcClassification([
      { id: "c", revenue: 5 },
      { id: "a", revenue: 70 },
      { id: "b", revenue: 20 },
      { id: "d", revenue: 5 },
      { id: "z", revenue: 0 },
    ]);
    assert.deepEqual(out.map((x) => `${x.item.id}:${x.class}`), ["a:A", "b:A", "c:B", "d:C"]);
    assert.equal(out[out.length - 1].cumulativeShare, 100);
  });

  it("no falla sin ventas", () => {
    assert.deepEqual(abcClassification([{ revenue: 0 }]), []);
    assert.deepEqual(categoryBreakdown([]), []);
  });
});
