"use client";

import {
  animate,
  motion,
  MotionConfig,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

import { formatARS, formatNumber, formatPct } from "@/lib/format";
import { EASE_OUT, fadeUp, stagger, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Respeta prefers-reduced-motion en toda la app. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Aparición progresiva al entrar en pantalla. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { ...transitions.slow, delay } },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

/** Contenedor que escalona la entrada de sus <StaggerItem>. */
export function Stagger({
  children,
  className,
  inView = false,
}: {
  children: ReactNode;
  className?: string;
  /** true: se dispara al entrar en pantalla; false: al montar. */
  inView?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger()}
      initial="hidden"
      {...(inView
        ? { whileInView: "visible", viewport: { once: true, margin: "-60px" } }
        : { animate: "visible" })}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

const FORMATTERS = {
  ars: (v: number) => formatARS(Math.round(v)),
  number: (v: number) => formatNumber(Math.round(v)),
  pct: (v: number) => formatPct(v),
} as const;

/** Cifra que cuenta hasta su valor la primera vez que se ve. */
export function AnimatedNumber({
  value,
  format = "number",
  className,
}: {
  value: number;
  format?: keyof typeof FORMATTERS;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(0);
  const text = useTransform(motionValue, FORMATTERS[format]);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, reduce, value, motionValue]);

  return (
    <motion.span ref={ref} className={cn("num", className)}>
      {text}
    </motion.span>
  );
}

/** Tarjeta con halo que sigue al cursor y leve elevación al pasar. */
export function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const background = useMotionTemplate`radial-gradient(340px circle at ${x}px ${y}px, rgb(139 92 246 / 0.11), transparent 70%)`;

  function onMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  }

  return (
    <motion.div
      className={cn("card group overflow-hidden", className)}
      onMouseMove={onMouseMove}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
}

/** Barra horizontal que crece hasta su proporción. */
export function GrowBar({ ratio, className }: { ratio: number; className?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
      <motion.div
        className={cn("h-full origin-left rounded-full bg-brand", className)}
        style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      />
    </div>
  );
}
