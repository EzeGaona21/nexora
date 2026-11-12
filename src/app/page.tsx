import type { Metadata } from "next";

import { AssistantScene } from "@/components/landing/assistant-scene";
import { DayStory } from "@/components/landing/day-story";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { PricingGrid, PricingNote } from "@/components/landing/pricing";
import { RubrosMarquee } from "@/components/landing/showcase";
import {
  Features,
  FinalCta,
  HowItWorks,
  LandingFooter,
  LandingNav,
  SectionHeading,
} from "@/components/landing/sections";
import { siteUrl } from "@/lib/supabase/env";

// Datos estructurados: le dicen a los buscadores y asistentes qué es NEXORA.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NEXORA",
  url: siteUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "es-AR",
  description:
    "Sistema de gestión de ventas, stock y gastos para comercios de Argentina, con análisis, alertas, predicción de ventas y un asistente con inteligencia artificial.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
  author: { "@type": "Person", name: "Ezequiel Gaona", url: "https://github.com/EzeGaona21" },
};

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav />
      <main>
        <Hero />
        <RubrosMarquee />
        <DayStory />
        <AssistantScene />
        <Features />
        <HowItWorks />

        <section id="precios" className="scroll-mt-24 border-t border-border bg-surface/40 px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Precios" title="Planes en pesos, sin letra chica">
              Empezá gratis y pasá a un plan mayor cuando lo necesites.
            </SectionHeading>
            <PricingGrid />
            <PricingNote />
          </div>
        </section>

        <section id="preguntas" className="scroll-mt-24 px-4 py-24 sm:px-6">
          <SectionHeading eyebrow="Preguntas frecuentes" title="Lo que nos preguntan" />
          <Faq />
        </section>

        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
