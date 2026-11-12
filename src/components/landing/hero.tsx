"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";

import { enterDemo } from "@/actions/auth";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ── Gráfico de puntos del hero ─────────────────────────────────────
// Ventas diarias de un comercio tipo: sube de a poco, con pico de fin de
// semana. Las últimas columnas son la estimación y se dibujan huecas.
const COLS = 36;
const ROWS = 14;
const FORECAST_COLS = 8;
const WEEK = [0.62, 0.7, 0.74, 0.8, 0.95, 1.12, 1.0];

const HEIGHTS = Array.from({ length: COLS }, (_, i) => {
  const growth = 0.2 + 0.42 * (i / (COLS - 1));
  return Math.max(2, Math.min(ROWS, Math.round(ROWS * growth * WEEK[i % 7])));
});

function DotChart() {
  const cell = 16;
  const gap = 4;
  const step = cell + gap;
  const firstForecast = COLS - FORECAST_COLS;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${COLS * step - gap} ${ROWS * step - gap}`}
      preserveAspectRatio="xMaxYMax slice"
      className="absolute inset-x-0 bottom-0 h-[58%] w-full [mask-image:linear-gradient(180deg,transparent,black_38%)] sm:h-[66%]"
    >
      {HEIGHTS.map((h, col) => {
        const forecast = col >= firstForecast;
        return (
          <g key={col} className="cell-col" style={{ animationDelay: `${0.5 + col * 0.035}s` }}>
            {Array.from({ length: h }, (_, k) => {
              const top = k === h - 1;
              return (
                <rect
                  key={k}
                  x={col * step + (forecast ? 1 : 0)}
                  y={(ROWS - 1 - k) * step + (forecast ? 1 : 0)}
                  width={cell - (forecast ? 2 : 0)}
                  height={cell - (forecast ? 2 : 0)}
                  fill={forecast ? "none" : top ? "#34D399" : "#10B981"}
                  fillOpacity={forecast ? 1 : top ? 1 : 0.16 + 0.5 * (k / ROWS)}
                  stroke={forecast ? "#34D399" : "none"}
                  strokeOpacity={top ? 1 : 0.45}
                  strokeWidth={2}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

const cta =
  "display inline-flex h-14 w-full cursor-pointer items-center justify-center gap-3 border-2 px-8 text-2xl transition-colors duration-150 sm:w-auto";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  // Al bajar, el titular se aleja y el gráfico se hunde: la portada cede el lugar.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const chartY = useTransform(scrollYProgress, [0, 1], [0, 140]);

  return (
    <section ref={ref} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      <motion.div aria-hidden className="absolute inset-0" style={{ y: chartY }}>
        <DotChart />
      </motion.div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative flex flex-1 flex-col items-center justify-center px-4 pb-[26svh] pt-28 text-center sm:px-8">
        <motion.p
          className="caption mb-5 text-muted sm:mb-7 sm:text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          Gestión de ventas para comercios
        </motion.p>

        <h1 aria-label="Vendé. Medí. Anticipate." className="display text-[19vw] sm:text-[clamp(5rem,13.5vw,15rem)]">
          {[
            { text: ["Vendé.", "Medí."], className: "text-fg" },
            { text: ["Anticipate."], className: "text-brand" },
          ].map((line, i) => (
            // El relleno superior deja lugar a las tildes dentro de la máscara.
            <span key={i} aria-hidden className="-mt-[0.1em] block overflow-hidden pt-[0.1em]">
              <motion.span
                className={cn("block", line.className)}
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.14, ease: EASE_OUT }}
              >
                {line.text.map((word) => (
                  <span key={word} className="block sm:mx-[0.08em] sm:inline">
                    {word}
                  </span>
                ))}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          className="mt-8 flex w-full max-w-xl flex-col items-center gap-6 sm:mt-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: EASE_OUT }}
        >
          <p className="text-pretty text-base text-fg/80 sm:text-lg">
            Ventas, stock y gastos en un solo lugar. NEXORA te muestra qué reponer, qué deja ganancia
            y cuánto podés esperar vender.
          </p>
          <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
            <Link href="/registro" className={cn(cta, "border-brand bg-brand text-black hover:border-brand-bright hover:bg-brand-bright")}>
              Empezar gratis
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            <form action={enterDemo} className="w-full sm:w-auto">
              <button type="submit" className={cn(cta, "border-fg bg-black text-fg hover:bg-fg hover:text-black")}>
                Explorar demo
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>

      {/* Pie del hero: lectura del gráfico */}
      <div className="caption relative flex items-end justify-between gap-4 px-4 pb-5 text-[0.65rem] text-fg/70 sm:px-8 sm:text-xs">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 bg-brand" />
          Ventas reales
        </span>
        <span className="hidden items-center gap-2 sm:flex">
          Bajá para ver un día completo
          <ArrowDown className="size-3.5" aria-hidden />
        </span>
        <span className="flex items-center gap-2">
          Estimación próximos días
          <span aria-hidden className="size-2.5 border-2 border-brand-bright" />
        </span>
      </div>
    </section>
  );
}
