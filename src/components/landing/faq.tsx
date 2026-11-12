"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { transitions } from "@/lib/motion";

const FAQS = [
  {
    q: "¿Necesito saber de sistemas para usarlo?",
    a: "No. Si sabés usar WhatsApp, sabés usar NEXORA. Cargás tus productos, registrás las ventas desde el celular o la computadora y el resto se calcula solo.",
  },
  {
    q: "¿Quién puede ver los datos de mi comercio?",
    a: "Solo vos y las personas que sumes a tu equipo. Cada comercio tiene un espacio aislado y la propia base de datos impide que una cuenta lea información de otra.",
  },
  {
    q: "¿Cómo se calculan las predicciones?",
    a: "Con métodos estadísticos sobre tu historial real: medias móviles, tendencia y estacionalidad semanal. Siempre mostramos el margen de error medido y, si todavía no hay suficientes ventas cargadas, te lo decimos en lugar de inventar un número.",
  },
  {
    q: "¿Sirve si vendo por Instagram o WhatsApp?",
    a: "Sí. Registrás cada venta con su medio de pago —efectivo, transferencia, Mercado Pago, tarjeta— y tenés stock y ganancias al día sin importar por dónde vendiste.",
  },
  {
    q: "¿Qué hace NEXORA AI con mis datos?",
    a: "Solo los lee para responderte. El asistente no puede modificar nada: consulta ventas, productos y gastos de tu comercio mediante funciones de lectura del servidor, y cada respuesta indica qué información consultó.",
  },
  {
    q: "¿Emite facturas de ARCA (ex AFIP)?",
    a: "No. NEXORA genera comprobantes internos para tu control. La facturación fiscal la seguís haciendo con tu sistema habitual.",
  },
  {
    q: "¿Puedo sumar empleados?",
    a: "Sí. Desde Equipo invitás a cada persona con su email y elegís su rol: un empleado registra ventas y gastos, pero no puede cancelar ventas ni borrar información. La cantidad de usuarios depende del plan.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl divide-y divide-border border-y border-border">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-button-${i}`}
                className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-fg transition-colors hover:text-brand-bright"
              >
                {item.q}
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={transitions.base}
                  className="shrink-0 text-muted"
                  aria-hidden
                >
                  <Plus className="size-4" />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={transitions.base}
                  className="overflow-hidden"
                >
                  <p className="pb-5 pr-10 text-sm leading-relaxed text-muted">{item.a}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
