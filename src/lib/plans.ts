import type { PlanTier } from "@/types/db";

/**
 * Planes comerciales. Fuente única para la página de precios y para los
 * límites que valida el servidor. Los cupos de usuarios y de IA también se
 * validan en la base (private.user_limit / private.ai_limit, migración 0005):
 * si cambian acá, hay que cambiarlos allá. Los cobros todavía no están habilitados:
 * todos los comercios nuevos arrancan en el plan gratuito.
 */
export interface Plan {
  id: PlanTier;
  name: string;
  priceARS: number;
  tagline: string;
  limits: { products: number | null; users: number | null; aiMessagesPerMonth: number };
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Inicial",
    priceARS: 0,
    tagline: "Para ordenar el negocio desde el primer día.",
    limits: { products: 50, users: 1, aiMessagesPerMonth: 20 },
    features: [
      "Hasta 50 productos",
      "1 usuario",
      "Ventas, gastos y stock",
      "Dashboard y alertas de stock",
      "NEXORA AI: 20 consultas de prueba por mes",
    ],
  },
  {
    id: "pro",
    name: "Profesional",
    priceARS: 24900,
    tagline: "Para decidir con datos y anticiparse.",
    limits: { products: 1000, users: 3, aiMessagesPerMonth: 300 },
    features: [
      "Hasta 1.000 productos",
      "3 usuarios con roles",
      "Predicción de ventas a 30 días",
      "Centro de alertas completo",
      "NEXORA AI: 300 consultas por mes",
      "Reportes exportables",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Negocio",
    priceARS: 59900,
    tagline: "Para equipos y catálogos grandes.",
    limits: { products: null, users: 10, aiMessagesPerMonth: 2000 },
    features: [
      "Productos ilimitados",
      "10 usuarios con roles",
      "Todo lo del plan Profesional",
      "NEXORA AI: 2.000 consultas por mes",
      "Soporte prioritario",
    ],
  },
];

export function getPlan(id: PlanTier): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
