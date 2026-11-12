"use client";

import { BellRing } from "lucide-react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { formatARS } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * "Un día en tu comercio": la sección queda fija mientras se recorre y el
 * panel va cambiando con la hora. El scroll solo decide en qué momento del
 * día estamos; cada cambio se anima por su cuenta, así en celulares no hay
 * animaciones atadas al dedo.
 */
const SCENES = [
  {
    time: "08:30",
    title: "Abrís.",
    body: "Levantás la persiana y ya está todo a la vista: cuánto vendiste ayer, qué falta reponer y cuánto se espera para hoy.",
  },
  {
    time: "11:15",
    title: "Vendés.",
    body: "Cada venta se carga en segundos. El stock se descuenta solo y la caja se actualiza en el mismo paso.",
  },
  {
    time: "17:40",
    title: "Te avisa.",
    body: "Queda poco aceite y sale rápido. NEXORA te lo dice antes de que el estante quede vacío.",
  },
  {
    time: "20:00",
    title: "Cerrás.",
    body: "Facturación, ganancia y gastos del día ya están calculados. No hay nada que pasar a una planilla.",
  },
  {
    time: "20:05",
    title: "Mañana.",
    body: "Con tu historial, estima cuánto vas a vender los próximos días y te muestra el margen de error.",
  },
] as const;

const LAST = SCENES.length - 1;

// Estado del comercio en cada momento del día.
const SALES_TOTAL = [0, 184_300, 612_750, 948_200, 948_200];
const SALES_COUNT = [0, 21, 68, 104, 104];
const STOCK = [
  { name: "Leche entera 1 L", min: 8, units: [24, 22, 15, 11, 11] },
  { name: "Aceite de girasol 900 ml", min: 6, units: [9, 8, 4, 3, 3] },
  { name: "Yerba mate 1 kg", min: 5, units: [18, 17, 14, 12, 12] },
];
const TICKETS = [
  { from: 3, time: "19:56", items: "Gaseosa cola 2,25 L, pan lactal", total: 7_200, pay: "Débito" },
  { from: 2, time: "17:38", items: "Aceite de girasol 900 ml ×2", total: 6_400, pay: "Efectivo" },
  { from: 1, time: "11:14", items: "Leche entera 1 L ×2, yerba 1 kg", total: 9_850, pay: "Mercado Pago" },
];

// Semana en columnas de cuadrados (mismo lenguaje que el gráfico de la portada).
const ROWS = 10;
const WEEK_DAYS = ["V", "S", "D", "L", "M", "M"];
const WEEK_CELLS = [7, 9, 8, 5, 6, 6];
const TODAY_CELLS = [0, 2, 6, 9, 9];
const FORECAST_CELLS = [8, 10, 9, 6, 6];

function Money({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => formatARS(Math.round(v)));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span className={cn("num", className)}>{text}</motion.span>;
}

function WeekChart({ step }: { step: number }) {
  const cell = 14;
  const gap = 4;
  const pitch = cell + gap;
  const cols = [
    ...WEEK_CELLS.map((h, i) => ({ h, label: WEEK_DAYS[i], kind: "past" as const })),
    { h: TODAY_CELLS[step], label: "Hoy", kind: "today" as const },
    ...FORECAST_CELLS.map((h) => ({ h, label: "", kind: "forecast" as const })),
  ];
  return (
    <svg viewBox={`0 0 ${cols.length * pitch - gap} ${ROWS * pitch + 14}`} className="h-full w-full" aria-hidden>
      {cols.map((c, x) =>
        Array.from({ length: ROWS }, (_, k) => {
          const on = k < c.h && (c.kind !== "forecast" || step === LAST);
          const hollow = c.kind === "forecast";
          return (
            <motion.rect
              key={`${x}-${k}`}
              x={x * pitch + (hollow ? 1 : 0)}
              y={(ROWS - 1 - k) * pitch + (hollow ? 1 : 0)}
              width={cell - (hollow ? 2 : 0)}
              height={cell - (hollow ? 2 : 0)}
              fill={hollow ? "none" : c.kind === "today" ? "#34D399" : "#10B981"}
              stroke={hollow ? "#34D399" : "none"}
              strokeWidth={2}
              initial={false}
              animate={{ opacity: on ? (c.kind === "past" ? 0.28 + 0.4 * (k / ROWS) : hollow ? 0.75 : 1) : 0 }}
              transition={{ duration: 0.35, delay: on ? (hollow ? (x - 7) * 0.07 : 0) + k * 0.03 : 0 }}
            />
          );
        }),
      )}
      {cols.map((c, x) =>
        c.label ? (
          <text
            key={x}
            x={x * pitch + cell / 2}
            y={ROWS * pitch + 11}
            textAnchor="middle"
            className={cn("num text-[9px]", c.kind === "today" ? "fill-brand-bright" : "fill-subtle")}
          >
            {c.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function Panel({ step }: { step: number }) {
  const tickets = TICKETS.filter((t) => step >= t.from);
  return (
    <div
      role="img"
      aria-label="Panel ilustrativo de NEXORA que cambia a lo largo del día: ventas, stock, una alerta y la estimación de los próximos días"
      className="relative w-full border border-border-strong bg-bg/90 shadow-pop backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 sm:px-5">
        <p className="text-xs text-muted">Almacén Don Julio · jueves</p>
        <p className="num flex items-center gap-2 text-xs text-fg">
          <span className={cn("size-1.5 rounded-full", step >= 3 ? "bg-subtle" : "bg-brand-bright")} />
          {SCENES[step].time}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-x-4 px-4 pt-4 sm:px-5 sm:pt-6">
        <div className="min-w-0">
          <p className="text-xs text-muted">{step === LAST ? "Estimado próximos 7 días" : "Ventas de hoy"}</p>
          <Money
            value={step === LAST ? 6_640_000 : SALES_TOTAL[step]}
            className="mt-1 block text-3xl font-semibold tracking-tight sm:text-5xl xl:text-6xl"
          />
          <p className="num mt-1.5 min-h-8 text-xs text-muted sm:min-h-4 sm:text-sm">
            {step === 0 && "Ayer $\u00a0902.400 · se esperan $\u00a0930.000"}
            {(step === 1 || step === 2) && `${SALES_COUNT[step]} ventas · ticket promedio $ ${step === 1 ? "8.776" : "9.011"}`}
            {step === 3 && (
              <>
                Ganancia <span className="text-brand-bright">$ 274.900</span> · gastos $ 38.000
              </>
            )}
            {step === LAST && "Rango probable: 5,9 a 7,4 millones"}
          </p>
        </div>
        <div className="h-24 w-36 sm:h-44 sm:w-72 xl:h-56 xl:w-96">
          <WeekChart step={step} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 border-t border-border sm:grid-cols-2">
        <div className="border-border px-4 py-3 sm:border-r sm:px-5 sm:py-4">
          <p className="mb-2 text-xs text-muted">Stock</p>
          <ul className="flex flex-col gap-1.5">
            {STOCK.map((s) => {
              const units = s.units[step];
              const low = units <= s.min;
              return (
                <li key={s.name} className="flex items-center justify-between gap-3 text-[13px] sm:text-sm">
                  <span className="truncate text-fg/90">{s.name}</span>
                  <motion.span
                    key={units}
                    className={cn("num shrink-0 px-1.5", low ? "bg-warning/15 text-warning" : "text-fg")}
                    initial={{ y: -6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {units} u.
                  </motion.span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="min-h-[5.5rem] border-t border-border px-4 py-3 sm:border-t-0 sm:px-5 sm:py-4">
          <p className="mb-2 text-xs text-muted">Últimas ventas</p>
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {tickets.length === 0 ? (
                <motion.li
                  key="empty"
                  className="text-[13px] sm:text-sm text-subtle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Todavía no hay ventas hoy.
                </motion.li>
              ) : (
                tickets.map((t, i) => (
                  <motion.li
                    key={t.time}
                    layout
                    className={cn("flex items-baseline gap-2 text-[13px] sm:text-sm", i > 1 && "hidden sm:flex")}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  >
                    <span className="num text-subtle">{t.time}</span>
                    <span className="min-w-0 flex-1 truncate text-fg/90">{t.items}</span>
                    <span className="num shrink-0 text-fg">{formatARS(t.total)}</span>
                  </motion.li>
                ))
              )}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {step === 2 ? (
          <motion.div
            key="alert"
            className="absolute inset-x-3 -bottom-5 flex items-start gap-3 border border-warning/50 bg-[#1c1608] px-4 py-3 shadow-pop sm:inset-x-auto sm:-right-6 sm:w-80"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
          >
            <BellRing className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p className="text-[13px] sm:text-sm leading-snug text-fg">
              <span className="font-semibold">Aceite de girasol 900 ml:</span> quedan 4 y salen 2 por día.
              Alcanza para 2 días.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function DayStory() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(LAST, Math.max(0, Math.floor(p * SCENES.length)));
    setStep((prev) => (prev === next ? prev : next));
  });

  // El resplandor cruza la pantalla como el sol y se apaga al cerrar.
  const glowX = useTransform(scrollYProgress, [0, 1], ["-10%", "85%"]);
  const glowY = useTransform(scrollYProgress, [0, 0.45, 1], ["55%", "5%", "70%"]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 0.75, 1], [0.5, 0.9, 0.35, 0.2]);

  const scene = SCENES[step];

  return (
    <section ref={ref} aria-label="Un día en tu comercio con NEXORA" className="relative h-[460svh] bg-black">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 size-[70vmin] rounded-full bg-brand/25 blur-[120px]"
          style={{ x: glowX, y: glowY, opacity: glowOpacity }}
        />

        <div className="relative mx-auto grid w-full max-w-[92rem] flex-1 grid-rows-[auto_1fr] items-center gap-6 px-4 pb-6 pt-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:grid-rows-1 lg:gap-16 lg:pb-10">
          <div aria-live="polite">
            <p className="caption mb-3 text-muted sm:mb-6">Un día en tu comercio</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.32, ease: EASE_OUT }}
              >
                <p className="num text-2xl text-brand-bright sm:text-4xl">{scene.time}</p>
                <h2 className="display mt-1 text-[17vw] sm:mt-3 sm:text-[clamp(5rem,10vw,11rem)]">{scene.title}</h2>
                <p className="mt-3 min-h-[4.5em] max-w-md text-pretty text-[15px] text-fg/80 sm:mt-6 sm:text-xl">{scene.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="self-start pb-6 lg:self-center lg:pb-0">
            <Panel step={step} />
          </div>
        </div>

        {/* Línea del día: avanza con el recorrido */}
        <div className="relative px-4 pb-5 sm:px-8">
          <div className="mx-auto max-w-[92rem]">
            <div className="h-px bg-border-strong">
              <motion.div className="h-px origin-left bg-brand-bright" style={{ scaleX: scrollYProgress }} />
            </div>
            <ol className="num mt-2 grid grid-cols-5 text-[11px] sm:text-xs">
              {SCENES.map((s, i) => (
                <li key={s.time} className={cn("transition-colors", i <= step ? "text-fg" : "text-subtle")}>
                  {s.time}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
