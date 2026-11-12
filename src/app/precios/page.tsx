import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";

import { PricingGrid, PricingNote } from "@/components/landing/pricing";
import { FinalCta, LandingFooter, LandingNav, SectionHeading } from "@/components/landing/sections";
import { Reveal } from "@/components/motion/primitives";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Precios",
  description: "Planes de NEXORA en pesos argentinos. Empezá gratis.",
};

const limit = (n: number | null) => (n === null ? "Ilimitados" : n.toLocaleString("es-AR"));

const ROWS: { label: string; values: (string | boolean)[] }[] = [
  { label: "Productos", values: PLANS.map((p) => limit(p.limits.products)) },
  { label: "Usuarios", values: PLANS.map((p) => limit(p.limits.users)) },
  { label: "Ventas, gastos y stock", values: [true, true, true] },
  { label: "Dashboard ejecutivo", values: [true, true, true] },
  { label: "Predicción de ventas", values: [false, true, true] },
  { label: "Centro de alertas completo", values: [false, true, true] },
  {
    label: "Consultas a NEXORA AI por mes",
    values: PLANS.map((p) =>
      p.limits.aiMessagesPerMonth === 0 ? false : p.limits.aiMessagesPerMonth.toLocaleString("es-AR"),
    ),
  },
  { label: "Soporte prioritario", values: [false, false, true] },
];

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main className="relative pt-32 sm:pt-40">
        <div aria-hidden className="backdrop-grid pointer-events-none absolute inset-x-0 top-0 h-[32rem]" />
        <section className="relative px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Precios" title="Simple, en pesos y sin letra chica">
              Empezá gratis. Cuando tu comercio crezca, el plan crece con vos.
            </SectionHeading>
            <PricingGrid />
            <PricingNote />
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6">
          <Reveal className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">Compará los planes</h2>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-5 py-4 text-left font-medium text-muted">
                      Incluye
                    </th>
                    {PLANS.map((p) => (
                      <th key={p.id} scope="col" className="px-5 py-4 text-center font-semibold">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-border last:border-0">
                      <th scope="row" className="px-5 py-3.5 text-left font-normal text-muted">
                        {row.label}
                      </th>
                      {row.values.map((v, i) => (
                        <td key={i} className="px-5 py-3.5 text-center">
                          {v === true ? (
                            <Check className="mx-auto size-4 text-brand" aria-label="Incluido" />
                          ) : v === false ? (
                            <Minus className="mx-auto size-4 text-subtle" aria-label="No incluido" />
                          ) : (
                            <span className="num">{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
