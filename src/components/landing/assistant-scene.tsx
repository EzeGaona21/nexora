"use client";

import { ArrowRight, ArrowUp, Sparkles } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { enterDemo } from "@/actions/auth";
import { EASE_OUT } from "@/lib/motion";

const QUESTION = "¿Qué productos debería reponer esta semana?";

// Respuesta en frases; lo marcado es el dato que salió de la consulta.
const ANSWER: { text: string; mark?: boolean }[][] = [
  [{ text: "Tres urgentes:" }],
  [{ text: "Soda sifón 2 L", mark: true }, { text: " está sin stock y vendió 16 unidades en 30 días." }],
  [{ text: "De " }, { text: "Aceite de girasol 900 ml", mark: true }, { text: " quedan 4 y salen 2 por día." }],
  [{ text: "Pasta dental 90 g", mark: true }, { text: " cubre 6 días más." }],
];

type Phase = "idle" | "typing" | "consulting" | "answer";

/** El asistente como escena: la pregunta se escribe sola y la respuesta llega con los datos marcados. */
export function AssistantScene() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!inView || phase !== "idle") return;
    setPhase(reduce ? "answer" : "typing");
  }, [inView, phase, reduce]);

  useEffect(() => {
    if (phase === "typing") {
      if (typed < QUESTION.length) {
        const t = setTimeout(() => setTyped((n) => n + 1), 34);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("consulting"), 450);
      return () => clearTimeout(t);
    }
    if (phase === "consulting") {
      const t = setTimeout(() => setPhase("answer"), 1300);
      return () => clearTimeout(t);
    }
  }, [phase, typed]);

  const sent = phase === "consulting" || phase === "answer";

  return (
    <section className="flex min-h-[100svh] items-center bg-brand px-4 py-20 text-black sm:px-8 sm:py-28">
      <div className="mx-auto grid w-full max-w-[92rem] items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="caption mb-5 inline-flex items-center gap-2 font-semibold">
            <Sparkles className="size-4" aria-hidden />
            NEXORA AI
          </p>
          <h2 className="display text-[19vw] sm:text-[clamp(5rem,10.5vw,11rem)]">Preguntale a tu negocio.</h2>
          <p className="mt-6 max-w-lg text-lg font-medium text-black/80 sm:text-xl">
            Escribí como hablás. El asistente consulta tus ventas, tu stock y tus gastos antes de
            responder, y si no hay datos suficientes te lo dice.
          </p>
          <form action={enterDemo} className="mt-8">
            <button
              type="submit"
              className="display inline-flex h-14 cursor-pointer items-center gap-3 border-2 border-black bg-black px-8 text-2xl text-fg transition-colors hover:bg-transparent hover:text-black focus-visible:outline-black"
            >
              Verlo en la demo
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </form>
        </div>

        <div ref={ref} className="flex min-h-[26rem] flex-col border-2 border-black bg-black p-4 sm:p-6">
          <div className="flex flex-1 flex-col justify-end gap-4" aria-live="polite">
            {sent ? (
              <motion.p
                className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-border bg-raised px-4 py-2.5 text-[15px] text-fg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                {QUESTION}
              </motion.p>
            ) : null}

            {sent ? (
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand-bright">
                  <Sparkles className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="num mb-2 text-xs text-subtle">
                    {phase === "consulting" ? (
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                      >
                        Consultando stock y ventas de 30 días…
                      </motion.span>
                    ) : (
                      "Consultó: stock · ventas de 30 días"
                    )}
                  </p>
                  {phase === "answer" ? (
                    <p className="text-[15px] leading-relaxed text-fg/90 sm:text-base">
                      {ANSWER.map((sentence, i) => (
                        <motion.span
                          key={i}
                          className="block"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.45, ease: EASE_OUT }}
                        >
                          {sentence.map((part) =>
                            part.mark ? (
                              <motion.mark
                                key={part.text}
                                className="bg-transparent font-semibold text-brand-bright"
                                initial={{ backgroundColor: "rgb(16 185 129 / 0.45)" }}
                                animate={{ backgroundColor: "rgb(16 185 129 / 0)" }}
                                transition={{ duration: 1.2, delay: i * 0.45 + 0.3 }}
                              >
                                {part.text}
                              </motion.mark>
                            ) : (
                              <span key={part.text}>{part.text}</span>
                            ),
                          )}
                        </motion.span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Caja de texto: acá se escribe la pregunta */}
          <div className="mt-5 flex items-center gap-3 border border-border-strong bg-bg px-4 py-3">
            <p className="min-h-6 flex-1 text-[15px] text-fg">
              {sent ? (
                <span className="text-subtle">Escribí tu pregunta</span>
              ) : (
                <>
                  {QUESTION.slice(0, typed)}
                  <motion.span
                    aria-hidden
                    className="ml-px inline-block h-4 w-0.5 translate-y-0.5 bg-brand-bright"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                </>
              )}
            </p>
            <span aria-hidden className="flex size-7 items-center justify-center bg-brand text-black">
              <ArrowUp className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-xs text-subtle">Conversación ilustrativa con datos de un comercio ficticio.</p>
        </div>
      </div>
    </section>
  );
}
