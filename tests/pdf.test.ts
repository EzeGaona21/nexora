import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PDFDocument } from "pdf-lib";

import { receiptToPdf, reportToPdf, toWinAnsi } from "../src/lib/reports/pdf.ts";
import type { Report } from "../src/lib/reports/types.ts";

describe("PDF", () => {
  it("reemplaza caracteres que la fuente estándar no puede dibujar", () => {
    assert.equal(toWinAnsi("Ñandú — café 🙂 $ 1.000"), "Ñandú — café ? $ 1.000");
  });

  it("genera un reporte paginado válido", async () => {
    const report: Report = {
      type: "ventas",
      title: "Ventas",
      orgName: "Almacén Don Julio",
      periodLabel: "1/8/2026 al 11/11/2026",
      columns: [
        { key: "date", label: "Fecha", kind: "date" },
        { key: "sales", label: "Ventas", kind: "int" },
        { key: "revenue", label: "Facturación", kind: "money" },
        { key: "margin", label: "Margen", kind: "pct" },
      ],
      rows: Array.from({ length: 90 }, (_, i) => ({
        date: `2026-08-${String((i % 28) + 1).padStart(2, "0")}`,
        sales: 20 + i,
        revenue: 150000 + i * 1000,
        margin: i === 3 ? -2.5 : 28.4,
      })),
      totals: { sales: 5805, revenue: 17505000 },
      summary: [
        { label: "Facturación", value: 17505000, kind: "money" },
        { label: "Ventas", value: 5805, kind: "int" },
      ],
    };
    const bytes = await reportToPdf(report, "11/11/2026, 20:30");
    assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 3, "90 filas no entran en menos de 3 páginas");
  });

  it("genera un reporte vacío sin fallar", async () => {
    const bytes = await reportToPdf(
      {
        type: "gastos",
        title: "Gastos",
        orgName: "Kiosco",
        periodLabel: "1/11/2026 al 2/11/2026",
        columns: [{ key: "amount", label: "Importe", kind: "money" }],
        rows: [],
        totals: null,
        summary: [],
      },
      "hoy",
    );
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  });

  it("genera el comprobante, incluso con muchos ítems y nombres raros", async () => {
    const bytes = await receiptToPdf({
      orgName: "Ferretería El Tornillo 🔩",
      number: 42,
      issuedAt: "11/11/2026, 18:05",
      cancelled: true,
      paymentLabel: "Mercado Pago",
      customerName: "María José Ñ.",
      items: Array.from({ length: 60 }, (_, i) => ({
        name: `Producto con un nombre extremadamente largo que no entra en la columna ${i}`,
        quantity: i + 1,
        unitPrice: 1234.5,
        lineTotal: 1234.5 * (i + 1),
      })),
      subtotal: 2259135,
      discount: 1000,
      total: 2258135,
    });
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 2);
    assert.match(doc.getTitle() ?? "", /000042/);
  });
});
