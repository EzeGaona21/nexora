import type { ReactNode } from "react";

import { LandingFooter, LandingNav } from "@/components/landing/sections";

export const LEGAL_UPDATED = "12 de noviembre de 2026";
export const LEGAL_CONTACT = "https://github.com/EzeGaona21";

export type LegalSection = { title: string; body: ReactNode };

/** Página de texto legal: una columna angosta, pensada para leer. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <LandingNav />
      <main className="bg-black px-4 pb-24 pt-32 sm:px-8 sm:pt-40">
        <article className="mx-auto max-w-3xl">
          <h1 className="display text-[13vw] sm:text-[clamp(3.5rem,7.5vw,7rem)]">{title}</h1>
          <p className="num mt-4 text-sm text-subtle">Última actualización: {LEGAL_UPDATED}</p>
          <p className="mt-8 text-pretty text-lg leading-relaxed text-fg/90">{intro}</p>
          {sections.map((s) => (
            <section key={s.title} className="mt-12 border-t border-border pt-8">
              <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
              <div className="mt-4 flex flex-col gap-4 leading-relaxed text-muted [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-fg [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </main>
      <LandingFooter />
    </>
  );
}
