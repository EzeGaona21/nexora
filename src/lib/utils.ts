import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Resultado uniforme de las server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export const DEMO_READONLY_MESSAGE =
  "La demo es de solo lectura. Creá tu cuenta gratis para operar con tus propios datos.";
