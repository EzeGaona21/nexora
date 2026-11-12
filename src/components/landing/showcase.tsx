"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { enterDemo } from "@/actions/auth";
import { EASE_OUT } from "@/lib/motion";

const RUBROS = [
  "Almacenes",
  "Ferreterías",
  "Tiendas de ropa",
  "Kioscos",
  "Farmacias",
  "Venta por WhatsApp",
  "Emprendimientos",
  "Comercios de barrio",
];

/** Franja a sangre con los rubros: cinta continua, se detiene con "reducir movimiento". */
export function RubrosMarquee() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {RUBROS.map((r) => (
        <li key={r} className="flex items-center whitespace-nowrap">
          <span className="px-5 sm:px-8">{r}</span>
          <span aria-hidden className="size-2.5 bg-black sm:size-3.5" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Rubros para los que sirve NEXORA" className="overflow-hidden bg-brand py-3 text-black sm:py-4">
      <div className="display marquee flex w-max text-3xl sm:text-5xl">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}

const FACTS = [
  { figure: "30", unit: "días", label: "de ventas estimadas hacia adelante, con su margen de error." },
  { figure: "6", unit: "alertas", label: "que avisan antes del problema: stock, caídas, gastos, márgenes." },
  { figure: "5", unit: "reportes", label: "listos para exportar a CSV y PDF cuando los pida el contador." },
  { figure: "1", unit: "lugar", label: "para ventas, stock y gastos. Se terminó el cuaderno." },
];

/** Lo que el producto hace, en cifras del propio producto (no métricas de uso). */
export function FactsBand() {
  return (
    <section className="bg-black px-4 py-16 sm:px-8 sm:py-24">
      <h2 className="display mx-auto mb-10 max-w-[92rem] text-center text-[13vw] text-fg sm:mb-14 sm:text-[clamp(4rem,9vw,9.5rem)]">
        Tu negocio, en números
      </h2>
      <dl className="mx-auto grid max-w-[92rem] grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {FACTS.map((f, i) => (
          <motion.div
            key={f.unit}
            className="bg-black p-5 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT }}
          >
            <dt>
              <span className="display block text-[28vw] text-fg sm:text-[clamp(7rem,13vw,13rem)]">
                {f.figure}
              </span>
              <span className="display mt-3 block text-3xl text-brand sm:mt-4 sm:text-5xl">{f.unit}</span>
            </dt>
            <dd className="mt-4 max-w-[18rem] text-sm leading-relaxed text-muted sm:text-[15px]">{f.label}</dd>
          </motion.div>
        ))}
      </dl>
    </section>
  );
}

const CHAT = [
  { role: "user", text: "¿Qué productos debería reponer esta semana?" },
  {
    role: "assistant",
    text: "Tres urgentes: Soda sifón 2 L está sin stock y vendió 16 unidades en 30 días. De Aceite de girasol 900 ml quedan 4 y salen 2 por día. Pasta dental 90 g cubre 6 días más.",
  },
  { role: "user", text: "¿Y cuánto voy a vender?" },
  {
    role: "assistant",
    text: "Para los próximos 7 días estimo $ 1.640.000, con un rango probable de $ 1.410.000 a $ 1.870.000. Es una estimación: no contempla feriados ni promociones.",
  },
] as const;

/** Bloque a sangre en esmeralda: el diferencial del producto, mostrado como conversación. */
export function AiShowcase() {
  return (
    <section className="bg-brand px-4 py-20 text-black sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-[92rem] items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="caption mb-5 inline-flex items-center gap-2 font-semibold">
            <Sparkles className="size-4" aria-hidden />
            NEXORA AI
          </p>
          <h2 className="display text-[19vw] sm:text-[clamp(5rem,10.5vw,11rem)]">
            Preguntale a tu negocio.
          </h2>
          <p className="mt-6 max-w-lg text-lg font-medium text-black/80 sm:text-xl">
            Escribí como hablás. El asistente consulta tus ventas, tu stock y tus gastos antes de
            responder, y si no hay datos suficientes te lo dice.
          </p>
          <form action={enterDemo} className="mt-8">
            <motion.button
              type="submit"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="display inline-flex h-14 cursor-pointer items-center gap-3 border-2 border-black bg-black px-8 text-2xl text-fg transition-colors hover:bg-transparent hover:text-black focus-visible:outline-black"
            >
              Verlo en la demo
              <ArrowRight className="size-5" aria-hidden />
            </motion.button>
          </form>
        </div>

        <div className="border-2 border-black bg-black p-4 sm:p-6">
          <ul className="flex flex-col gap-4">
            {CHAT.map((m, i) => (
              <motion.li
                key={m.text}
                className={m.role === "user" ? "flex justify-end" : "flex gap-3"}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.35, ease: EASE_OUT }}
              >
                {m.role === "assistant" ? (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand-bright">
                    <Sparkles className="size-3.5" aria-hidden />
                  </span>
                ) : null}
                <p
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md border border-border bg-raised px-4 py-2.5 text-[15px] text-fg"
                      : "pt-0.5 text-[15px] leading-relaxed text-fg/90"
                  }
                >
                  {m.text}
                </p>
              </motion.li>
            ))}
          </ul>
          <p className="mt-5 border-t border-border pt-3 text-xs text-subtle">
            Conversación ilustrativa con datos de un comercio ficticio.
          </p>
        </div>
      </div>
    </section>
  );
}
