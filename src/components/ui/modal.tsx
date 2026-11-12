"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

import { overlay, scaleIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Modal accesible: Radix aporta foco atrapado, Escape y lectores de pantalla;
 * Motion anima entrada y salida. En mobile se presenta como hoja inferior.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px]"
                variants={overlay}
                initial="hidden"
                animate="visible"
                exit="exit"
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={cn(
                    "glass pointer-events-auto flex max-h-[92dvh] w-full flex-col overflow-hidden",
                    "rounded-t-2xl border border-border shadow-pop sm:rounded-2xl",
                    size === "sm" && "sm:max-w-sm",
                    size === "md" && "sm:max-w-lg",
                    size === "lg" && "sm:max-w-2xl",
                  )}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                    <div className="min-w-0">
                      <Dialog.Title className="text-base font-semibold tracking-tight text-fg">
                        {title}
                      </Dialog.Title>
                      {description ? (
                        <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                          {description}
                        </Dialog.Description>
                      ) : null}
                    </div>
                    <Dialog.Close
                      className="-mr-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
                      aria-label="Cerrar"
                    >
                      <X className="size-4" />
                    </Dialog.Close>
                  </div>
                  <div className="overflow-y-auto px-5 py-5">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
