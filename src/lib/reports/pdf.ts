/**
 * Generación de PDF en el servidor con pdf-lib (sin navegador ni fuentes
 * externas). Dos documentos: reportes tabulares y comprobante interno de venta.
 * Se imprimen en claro, con el esmeralda de marca como único acento.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatCell, isNumericKind } from "./cells.ts";
import type { Report } from "./types.ts";

const INK = rgb(0.06, 0.09, 0.13);
const MUTED = rgb(0.39, 0.45, 0.55);
const RULE = rgb(0.86, 0.89, 0.92);
const ZEBRA = rgb(0.965, 0.975, 0.985);
const BRAND = rgb(0.02, 0.59, 0.41);
const DANGER = rgb(0.86, 0.15, 0.15);

/** Helvetica estándar codifica WinAnsi: se reemplaza lo que no entra. */
export function toWinAnsi(text: string): string {
  return text
    .replace(/[\u00a0\u202f\u2009]/g, " ")
    .replace(/[^\x20-\x7e\u00a1-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/gu, "?");
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const clean = toWinAnsi(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}

interface TextOptions {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
  color?: ReturnType<typeof rgb>;
  /** Ancho de la celda; con align "right" el texto termina en x + width. */
  width?: number;
  align?: "left" | "right";
}

function text(page: PDFPage, value: string, o: TextOptions) {
  const content = o.width ? fit(value, o.font, o.size, o.width) : toWinAnsi(value);
  const x =
    o.align === "right" && o.width
      ? o.x + o.width - o.font.widthOfTextAtSize(content, o.size)
      : o.x;
  page.drawText(content, { x, y: o.y, size: o.size, font: o.font, color: o.color ?? INK });
}

function wordmark(page: PDFPage, x: number, y: number, bold: PDFFont) {
  page.drawRectangle({ x, y: y - 2, width: 12, height: 12, color: BRAND });
  page.drawText("NEXORA", { x: x + 18, y, size: 11, font: bold, color: INK });
}

// ── Reporte tabular ────────────────────────────────────────────────

export async function reportToPdf(report: Report, generatedAt: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`NEXORA · ${report.title} · ${report.orgName}`);
  doc.setCreator("NEXORA");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 841.89; // A4 apaisado
  const H = 595.28;
  const M = 40;
  const ROW = 18;
  const tableWidth = W - M * 2;

  // Reparto del ancho: la primera columna y las de texto reciben más lugar.
  const weights = report.columns.map((c, i) => (i === 0 ? 3 : isNumericKind(c.kind) ? 1.15 : 1.7));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / weightSum) * tableWidth);
  const offsets = widths.map((_, i) => M + widths.slice(0, i).reduce((a, b) => a + b, 0));

  let page!: PDFPage;
  let y = 0;

  const drawTableHeader = () => {
    page.drawRectangle({ x: M, y: y - 5, width: tableWidth, height: ROW, color: ZEBRA });
    report.columns.forEach((c, i) => {
      text(page, c.label.toUpperCase(), {
        x: offsets[i] + 6,
        y,
        size: 7,
        font: bold,
        color: MUTED,
        width: widths[i] - 12,
        align: isNumericKind(c.kind) ? "right" : "left",
      });
    });
    y -= ROW;
  };

  const newPage = (first: boolean) => {
    page = doc.addPage([W, H]);
    y = H - M;
    wordmark(page, M, y - 8, bold);
    text(page, report.orgName, { x: M, y: y - 8, size: 9, font: regular, color: MUTED, width: tableWidth, align: "right" });
    y -= 34;
    if (first) {
      text(page, `Reporte de ${report.title.toLowerCase()}`, { x: M, y, size: 18, font: bold });
      y -= 16;
      text(page, report.periodLabel, { x: M, y, size: 10, font: regular, color: MUTED });
      y -= 26;
      if (report.summary.length > 0) {
        const cardW = Math.min(180, tableWidth / report.summary.length);
        report.summary.forEach((s, i) => {
          const x = M + i * cardW;
          text(page, s.label.toUpperCase(), { x, y, size: 7, font: bold, color: MUTED, width: cardW - 12 });
          text(page, formatCell(s.value, s.kind), { x, y: y - 16, size: 13, font: bold, width: cardW - 12 });
        });
        y -= 40;
      }
    } else {
      text(page, `${report.title} · ${report.periodLabel}`, { x: M, y, size: 10, font: regular, color: MUTED });
      y -= 20;
    }
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.6, color: RULE });
    y -= 6;
    drawTableHeader();
  };

  const drawRow = (row: Record<string, string | number | null>, font: PDFFont, zebra: boolean) => {
    if (zebra) page.drawRectangle({ x: M, y: y - 5, width: tableWidth, height: ROW, color: ZEBRA });
    report.columns.forEach((c, i) => {
      const value = row[c.key] ?? null;
      text(page, formatCell(value, c.kind), {
        x: offsets[i] + 6,
        y,
        size: 8.5,
        font,
        color: typeof value === "number" && value < 0 ? DANGER : INK,
        width: widths[i] - 12,
        align: isNumericKind(c.kind) ? "right" : "left",
      });
    });
    y -= ROW;
  };

  newPage(true);
  if (report.rows.length === 0) {
    text(page, "No hay registros en el período seleccionado.", { x: M + 6, y, size: 10, font: regular, color: MUTED });
    y -= ROW;
  }
  report.rows.forEach((row, index) => {
    if (y < M + 40) newPage(false);
    drawRow(row, regular, index % 2 === 1);
  });
  if (report.totals) {
    if (y < M + 40) newPage(false);
    page.drawLine({ start: { x: M, y: y + 11 }, end: { x: W - M, y: y + 11 }, thickness: 0.8, color: INK });
    const first = report.columns[0].key;
    drawRow({ ...report.totals, [first]: "Total" }, bold, false);
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    text(p, `Generado el ${generatedAt} · Los importes están expresados en pesos argentinos (ARS).`, {
      x: M,
      y: 22,
      size: 7.5,
      font: regular,
      color: MUTED,
    });
    text(p, `Página ${i + 1} de ${pages.length}`, {
      x: M,
      y: 22,
      size: 7.5,
      font: regular,
      color: MUTED,
      width: tableWidth,
      align: "right",
    });
  });

  return doc.save();
}

// ── Comprobante interno de venta ───────────────────────────────────

export interface ReceiptData {
  orgName: string;
  number: number;
  /** Fecha y hora ya formateadas en horario de Argentina. */
  issuedAt: string;
  cancelled: boolean;
  paymentLabel: string;
  customerName: string | null;
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
}

const precise = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export async function receiptToPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const number = String(data.number).padStart(6, "0");
  doc.setTitle(`Comprobante ${number} · ${data.orgName}`);
  doc.setCreator("NEXORA");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 419.53; // A5
  const H = 595.28;
  const M = 32;
  const inner = W - M * 2;
  const ROW = 17;
  const cols = { qty: 34, unit: 78, total: 84 };
  const nameW = inner - cols.qty - cols.unit - cols.total;

  let page!: PDFPage;
  let y = 0;

  const itemsHeader = () => {
    const base = { y, size: 7, font: bold, color: MUTED } as const;
    text(page, "PRODUCTO", { ...base, x: M, width: nameW });
    text(page, "CANT.", { ...base, x: M + nameW, width: cols.qty, align: "right" });
    text(page, "P. UNITARIO", { ...base, x: M + nameW + cols.qty, width: cols.unit, align: "right" });
    text(page, "IMPORTE", { ...base, x: M + nameW + cols.qty + cols.unit, width: cols.total, align: "right" });
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: RULE });
    y -= 14;
  };

  const newPage = (first: boolean) => {
    page = doc.addPage([W, H]);
    y = H - M - 8;
    wordmark(page, M, y, bold);
    text(page, `N.º ${number}`, { x: M, y, size: 11, font: bold, width: inner, align: "right" });
    y -= 30;
    if (first) {
      text(page, data.orgName, { x: M, y, size: 15, font: bold, width: inner });
      y -= 15;
      text(page, "Comprobante interno de venta", { x: M, y, size: 9, font: regular, color: MUTED });
      y -= 24;
      const meta: [string, string][] = [
        ["Fecha", data.issuedAt],
        ["Pago", data.paymentLabel],
      ];
      if (data.customerName) meta.push(["Cliente", data.customerName]);
      for (const [label, value] of meta) {
        text(page, label, { x: M, y, size: 9, font: regular, color: MUTED });
        text(page, value, { x: M + 56, y, size: 9, font: regular, width: inner - 56 });
        y -= 14;
      }
      if (data.cancelled) {
        y -= 4;
        page.drawRectangle({ x: M, y: y - 6, width: inner, height: 20, borderColor: DANGER, borderWidth: 0.8 });
        text(page, "VENTA CANCELADA — el stock fue devuelto", { x: M + 8, y, size: 8.5, font: bold, color: DANGER });
        y -= 22;
      }
      y -= 10;
    }
    itemsHeader();
  };

  newPage(true);
  for (const item of data.items) {
    if (y < M + 110) newPage(false);
    const base = { y, size: 9, font: regular } as const;
    text(page, item.name, { ...base, x: M, width: nameW - 8 });
    text(page, String(item.quantity), { ...base, x: M + nameW, width: cols.qty, align: "right" });
    text(page, precise.format(item.unitPrice), { ...base, x: M + nameW + cols.qty, width: cols.unit, align: "right" });
    text(page, precise.format(item.lineTotal), {
      ...base,
      x: M + nameW + cols.qty + cols.unit,
      width: cols.total,
      align: "right",
    });
    y -= ROW;
  }

  y -= 2;
  page.drawLine({ start: { x: M, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 0.6, color: RULE });
  y -= 8;
  const totalsX = M + inner - 190;
  const line = (label: string, value: string, strong = false) => {
    text(page, label, { x: totalsX, y, size: strong ? 11 : 9, font: strong ? bold : regular, color: strong ? INK : MUTED });
    text(page, value, { x: totalsX, y, size: strong ? 12 : 9, font: strong ? bold : regular, width: 190, align: "right" });
    y -= strong ? 20 : 15;
  };
  line("Subtotal", precise.format(data.subtotal));
  if (data.discount > 0) line("Descuento", `- ${precise.format(data.discount)}`);
  y -= 3;
  line("Total", precise.format(data.total), true);

  text(page, "Documento no válido como factura. Comprobante de uso interno generado con NEXORA.", {
    x: M,
    y: 26,
    size: 7,
    font: regular,
    color: MUTED,
    width: inner,
  });

  return doc.save();
}
