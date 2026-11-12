"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { transitions } from "@/lib/motion";

/** template.tsx se vuelve a montar en cada navegación: transición de entrada entre páginas. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.base}
    >
      {children}
    </motion.div>
  );
}
