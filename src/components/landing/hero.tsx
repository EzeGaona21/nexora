"use client";

import { ArrowRight, TrendingUp } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import type { MouseEvent } from "react";

import { enterDemo } from "@/actions/auth";
import { LogoMark } from "@/components/layout/logo";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PREVIEW_KPIS = [
  { label: "Facturación del mes", value: "$ 6.482.300", delta: "+12,4 %" },
  { label: "Ganancia estimada", value: "$ 1.874.150", delta: "+9,1 %" },
  { label: "Ticket promedio", value: "$ 8.940", delta: "+3,2 %" },
];

const PREVIEW_PRODUCTS = [
  { name: "Leche entera 1 L", ratio: 1 },
  { name: "Gaseosa cola 2,25 L", ratio: 0.86 },
  { name: "Yerba mate 1 kg", ratio: 0.74 },
  { name: "Cerveza lata 473 ml", ratio: 0.61 },
];

const AREA =
  "M0 92 C 30 88, 45 70, 70 74 S 110 52, 140 58 S 185 30, 215 40 S 260 22, 290 28 S 335 10, 360 14";

/** Maqueta ilustrativa del producto: inclina levemente siguiendo al cursor. */
export function ProductPreview() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 120, damping: 18 });

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      className="relative mx-auto w-full max-w-5xl [perspective:1600px]"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div
        aria-hidden
        className="absolute inset-x-[12%] -top-6 h-40 rounded-full bg-brand/20 blur-[90px]"
      />
      <motion.div
        role="img"
        aria-label="Vista ilustrativa del dashboard de NEXORA con indicadores, evolución de ventas y productos más vendidos"
        className="card relative overflow-hidden shadow-pop"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {/* Barra de ventana */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="num ml-3 rounded-md border border-border bg-bg px-2.5 py-0.5 text-[11px] text-subtle">
            nexora.app/dashboard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[13rem_1fr]">
          <div className="hidden flex-col gap-1.5 border-r border-border p-4 md:flex">
            <div className="mb-3 flex items-center gap-2">
              <LogoMark className="size-5" />
              <span className="text-xs font-semibold tracking-[0.14em]">NEXORA</span>
            </div>
            {["Dashboard", "Ventas", "Productos", "Gastos", "Predicciones", "Alertas"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs",
                  i === 0 ? "border border-border bg-raised text-fg" : "text-subtle",
                )}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PREVIEW_KPIS.map((k) => (
                <div key={k.label} className="rounded-xl border border-border bg-bg p-3.5">
                  <p className="text-[11px] text-muted">{k.label}</p>
                  <p className="num mt-1.5 text-lg font-semibold">{k.value}</p>
                  <p className="num mt-1 inline-flex items-center gap-1 text-[11px] text-brand-bright">
                    <TrendingUp className="size-3" aria-hidden />
                    {k.delta}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-border bg-bg p-3.5">
                <p className="text-[11px] text-muted">Evolución de ventas · 30 días</p>
                <svg viewBox="0 0 360 100" className="mt-2 h-28 w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d={`${AREA} L360 100 L0 100 Z`}
                    fill="url(#hero-area)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.1 }}
                  />
                  <motion.path
                    d={AREA}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, delay: 0.5, ease: EASE_OUT }}
                  />
                </svg>
              </div>
              <div className="rounded-xl border border-border bg-bg p-3.5">
                <p className="text-[11px] text-muted">Más vendidos</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {PREVIEW_PRODUCTS.map((p, i) => (
                    <li key={p.name}>
                      <p className="mb-1 truncate text-[11px] text-fg">{p.name}</p>
                      <div className="h-1 overflow-hidden rounded-full bg-raised">
                        <motion.div
                          className="h-full origin-left rounded-full bg-brand"
                          style={{ width: `${p.ratio * 100}%` }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.7, delay: 0.8 + i * 0.08, ease: EASE_OUT }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <p className="mt-3 text-center text-xs text-subtle">
        Vista ilustrativa. En la demo vas a ver el producto real con datos de un comercio ficticio.
      </p>
    </div>
  );
}

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
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      <DotChart />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-[26svh] pt-28 text-center sm:px-8">
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
      </div>

      {/* Pie del hero: lectura del gráfico */}
      <div className="caption relative flex items-end justify-between gap-4 px-4 pb-5 text-[0.65rem] text-fg/70 sm:px-8 sm:text-xs">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 bg-brand" />
          Ventas reales
        </span>
        <span className="flex items-center gap-2">
          Estimación próximos días
          <span aria-hidden className="size-2.5 border-2 border-brand-bright" />
        </span>
      </div>
    </section>
  );
}
