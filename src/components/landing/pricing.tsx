import { Check } from "lucide-react";
import Link from "next/link";

import { Reveal, SpotlightCard } from "@/components/motion/primitives";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { formatARS } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {PLANS.map((plan, i) => (
        <Reveal key={plan.id} delay={i * 0.07} className="h-full">
          <SpotlightCard
            className={cn("h-full", plan.highlighted && "border-brand/40 shadow-glow")}
          >
            <div className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                {plan.highlighted ? <Badge tone="brand">Más elegido</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="num text-4xl font-semibold tracking-tight">
                  {plan.priceARS === 0 ? "$ 0" : formatARS(plan.priceARS)}
                </span>
                <span className="text-sm text-subtle">/ mes</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/registro"
                className={cn(
                  buttonVariants({ variant: plan.highlighted ? "primary" : "secondary" }),
                  "mt-8 w-full",
                )}
              >
                {plan.priceARS === 0 ? "Empezar gratis" : "Empezar con el plan Inicial"}
              </Link>
            </div>
          </SpotlightCard>
        </Reveal>
      ))}
    </div>
  );
}

export function PricingNote() {
  return (
    <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] text-subtle">
      Precios finales en pesos argentinos. Los planes pagos todavía no están a la venta: hoy todas
      las cuentas se crean en el plan Inicial y vas a poder cambiar de plan cuando habilitemos los
      pagos.
    </p>
  );
}
