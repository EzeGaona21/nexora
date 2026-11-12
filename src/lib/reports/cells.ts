/** Formato de celdas compartido por la vista, el CSV y el PDF. Módulo puro. */

import type { CellKind, CellValue } from "./types.ts";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Intl usa espacios duros (U+00A0 / U+202F) que no todas las fuentes PDF traen. */
function plainSpaces(text: string): string {
  return text.replace(/[  ]/g, " ");
}

export function formatDateAR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}

/** Texto legible para pantalla y PDF. */
export function formatCell(value: CellValue, kind: CellKind): string {
  if (value === null || value === "") return "—";
  if (typeof value === "string") return kind === "date" ? formatDateAR(value) : value;
  switch (kind) {
    case "money":
      return plainSpaces(money.format(value));
    case "pct":
      return `${plainSpaces(decimal.format(value))} %`;
    case "int":
      return plainSpaces(integer.format(value));
    default:
      return String(value);
  }
}

export function isNumericKind(kind: CellKind): boolean {
  return kind === "money" || kind === "int" || kind === "pct";
}
