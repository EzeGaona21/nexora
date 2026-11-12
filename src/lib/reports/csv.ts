/**
 * Exportación CSV pensada para Excel en español: separador ";", coma
 * decimal y BOM UTF-8 para que los acentos se lean bien. Módulo puro.
 */

import { formatDateAR } from "./cells.ts";
import type { CellKind, CellValue, Report } from "./types.ts";

/**
 * Una celda de texto que empieza con = + - @ puede ejecutarse como fórmula
 * al abrir el archivo (CSV injection): se neutraliza con un apóstrofo.
 */
export function escapeCsvText(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvCell(value: CellValue, kind: CellKind): string {
  if (value === null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    const fixed = kind === "int" ? String(Math.round(value)) : value.toFixed(2);
    return fixed.replace(".", ",");
  }
  return escapeCsvText(kind === "date" ? formatDateAR(value) : value);
}

export function reportToCsv(report: Report): string {
  const lines: string[] = [];
  lines.push(escapeCsvText(`NEXORA · ${report.title}`));
  lines.push(escapeCsvText(report.orgName));
  lines.push(escapeCsvText(report.periodLabel));
  lines.push("");
  lines.push(report.columns.map((c) => escapeCsvText(c.label)).join(";"));
  for (const row of report.rows) {
    lines.push(report.columns.map((c) => csvCell(row[c.key] ?? null, c.kind)).join(";"));
  }
  if (report.totals) {
    const totals = report.totals;
    lines.push(
      report.columns
        .map((c, i) => (i === 0 ? "Total" : csvCell(totals[c.key] ?? null, c.kind)))
        .join(";"),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
