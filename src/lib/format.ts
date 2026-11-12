import { AR_TIMEZONE } from "@/lib/dates";

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const arsPreciseFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-AR");

const compactFormatter = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatARS(value: number): string {
  return arsFormatter.format(value);
}

export function formatARSPrecise(value: number): string {
  return arsPreciseFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** $ 1,2 M — para ejes de gráficos. */
export function formatARSCompact(value: number): string {
  return `$ ${compactFormatter.format(value)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toLocaleString("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}

/** "11 nov" a partir de YYYY-MM-DD. */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatLongDay(date: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Fecha y hora de Argentina a partir de un timestamp ISO. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AR_TIMEZONE,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: AR_TIMEZONE,
  }).format(new Date(iso));
}

export function marginPct(cost: number, price: number): number {
  return price > 0 ? ((price - cost) / price) * 100 : 0;
}

export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "otro", label: "Otro" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [
  PaymentMethod,
  ...PaymentMethod[],
];

export function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export const BUSINESS_TYPES = [
  { value: "almacen", label: "Almacén / kiosco" },
  { value: "indumentaria", label: "Tienda de ropa" },
  { value: "ferreteria", label: "Ferretería" },
  { value: "farmacia", label: "Farmacia / perfumería" },
  { value: "online", label: "Venta por redes y WhatsApp" },
  { value: "comercio", label: "Otro comercio" },
] as const;

export const EXPENSE_CATEGORIES = [
  "Alquiler",
  "Sueldos",
  "Servicios",
  "Impuestos",
  "Mantenimiento",
  "Marketing",
  "Insumos",
  "Comisiones",
  "Logística",
  "Otros",
] as const;
