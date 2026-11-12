/** Modelo común de un reporte: lo consumen la vista, el CSV y el PDF. */

export const REPORT_TYPES = ["ventas", "rentabilidad", "gastos", "inventario", "productos"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

export const REPORT_META: Record<ReportType, { title: string; description: string; usesPeriod: boolean }> = {
  ventas: {
    title: "Ventas",
    description: "Facturación, cantidad de ventas y ticket promedio día por día.",
    usesPeriod: true,
  },
  rentabilidad: {
    title: "Rentabilidad",
    description: "Ganancia bruta y margen por producto en el período.",
    usesPeriod: true,
  },
  gastos: {
    title: "Gastos",
    description: "Detalle de gastos registrados y total por categoría.",
    usesPeriod: true,
  },
  inventario: {
    title: "Inventario",
    description: "Stock actual, valorización a costo y estado de reposición.",
    usesPeriod: false,
  },
  productos: {
    title: "Rendimiento de productos",
    description: "Unidades, participación en la facturación y cobertura de stock.",
    usesPeriod: true,
  },
};

export type CellKind = "text" | "date" | "money" | "int" | "pct";
export type CellValue = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  kind: CellKind;
}

export interface Report {
  type: ReportType;
  title: string;
  orgName: string;
  /** "1/10/2026 al 31/10/2026" o "Al 11/11/2026". */
  periodLabel: string;
  columns: ReportColumn[];
  rows: Record<string, CellValue>[];
  /** Fila de totales (solo las columnas que tiene sentido sumar). */
  totals: Record<string, CellValue> | null;
  /** Cifras destacadas que encabezan el reporte. */
  summary: { label: string; value: number; kind: CellKind }[];
}
