"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

/**
 * Barra de progreso superior. Aparece apenas se toca un enlace interno o se
 * envía un formulario y se oculta cuando la ruta termina de cambiar: así
 * cada clic tiene respuesta inmediata aunque el servidor tarde.
 */
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, setPending] = useState(false);

  // La ruta (o sus parámetros) cambió: la navegación terminó.
  useEffect(() => {
    setPending(false);
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      const current = window.location;
      if (url.pathname === current.pathname && url.search === current.search) return;
      setPending(true);
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      // Formularios GET (filtros) y acciones de servidor que navegan (demo, cerrar sesión).
      if (form && (form.method === "get" || form.querySelector('input[name^="$ACTION"]'))) setPending(true);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  // Red de seguridad: nunca queda encendida para siempre.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(false), 12000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <AnimatePresence>
      {pending ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 origin-left bg-brand-bright shadow-[0_0_10px_rgb(167_139_250/0.7)] print:hidden"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: [0, 0.35, 0.7, 0.9], transition: { duration: 6, times: [0, 0.08, 0.35, 1], ease: "easeOut" } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.25 } }}
        />
      ) : null}
    </AnimatePresence>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
