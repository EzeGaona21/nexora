import type { Transition, Variants } from "motion/react";

/**
 * Sistema de movimiento de NEXORA.
 * Principios: el movimiento explica (de dónde viene algo, qué cambió), dura
 * poco (150–450 ms) y solo anima transform y opacity. <MotionConfig
 * reducedMotion="user"> en el layout desactiva los desplazamientos para
 * quien tiene activado "reducir movimiento".
 */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const transitions = {
  fast: { duration: 0.15, ease: EASE_OUT },
  base: { duration: 0.28, ease: EASE_OUT },
  slow: { duration: 0.45, ease: EASE_OUT },
  spring: { type: "spring", stiffness: 420, damping: 34 },
} satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transitions.slow },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
};

/** Contenedor que escalona la entrada de sus hijos (usar con fadeUp). */
export const stagger = (delayChildren = 0, staggerChildren = 0.06): Variants => ({
  hidden: {},
  visible: { transition: { delayChildren, staggerChildren } },
});

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: transitions.fast },
};

export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.fast },
  exit: { opacity: 0, transition: transitions.fast },
};

export const slideInLeft: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: transitions.base },
  exit: { x: "-100%", transition: transitions.fast },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, x: -8, transition: transitions.fast },
};
