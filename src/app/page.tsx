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

export default function LandingPage() {
  return (
    <>
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
