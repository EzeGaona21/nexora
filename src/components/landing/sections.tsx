import Link from "next/link";
import type { ReactNode } from "react";

import { enterDemo } from "@/actions/auth";
import { Logo } from "@/components/layout/logo";
import { Reveal } from "@/components/motion/primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#caracteristicas", label: "Características" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/precios", label: "Precios" },
  { href: "/#preguntas", label: "Preguntas" },
];

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3">
      <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-border px-4">
        <Link href="/" aria-label="NEXORA · inicio">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Secciones">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Iniciar sesión
          </Link>
          <Link href="/registro" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>
            Empezar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <Reveal className="mx-auto mb-12 max-w-5xl text-center sm:mb-16">
      <p className="caption mb-4 text-brand">{eyebrow}</p>
      <h2 className="display text-balance text-[13vw] sm:text-[clamp(3.5rem,7.5vw,7.5rem)]">{title}</h2>
      {children ? <p className="mx-auto mt-5 max-w-xl text-pretty text-muted sm:text-lg">{children}</p> : null}
    </Reveal>
  );
}

const FEATURES = [
  {
    title: "Ventas",
    body: "Buscá el producto, elegí el medio de pago y listo. El stock se descuenta en el mismo paso y cada venta queda con su comprobante interno.",
  },
  {
    title: "Stock",
    body: "Stock mínimo por producto, aviso antes de quedarte sin mercadería y registro de cada movimiento.",
  },
  {
    title: "Ganancia",
    body: "Margen por producto y resultado neto después de gastos. Sabés qué deja plata y qué solo ocupa estante.",
  },
  {
    title: "Predicción",
    body: "Estimaciones a 7, 14 y 30 días sobre tu historial, con tendencia, estacionalidad semanal y el margen de error a la vista.",
  },
  {
    title: "Alertas",
    body: "Stock crítico, productos estancados, caídas de ventas, gastos fuera de lo normal y márgenes bajos. Cada alerta explica la regla que la disparó.",
  },
  {
    title: "Reportes",
    body: "Ventas, productos, gastos, stock y resultados, listos para exportar a CSV y PDF cuando los pida el contador.",
  },
];

export function Features() {
  return (
    <section id="caracteristicas" className="scroll-mt-24 bg-black px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[92rem]">
        <Reveal>
          <h2 className="display max-w-5xl text-[13vw] sm:text-[clamp(3.5rem,7.5vw,7.5rem)]">
            Chau cuadernos y planillas
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-muted sm:text-lg">
            Un solo sistema para operar el día a día y entender hacia dónde va tu negocio.
          </p>
        </Reveal>
        <ul className="mt-12 border-b border-border sm:mt-16">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="group grid items-center gap-x-12 gap-y-2 border-t border-border py-6 transition-colors hover:border-brand sm:py-8 lg:grid-cols-2"
            >
              <h3 className="display text-[15vw] transition-colors duration-200 group-hover:text-brand sm:text-7xl lg:text-8xl">
                {f.title}
              </h3>
              <p className="max-w-xl text-pretty leading-relaxed text-muted sm:text-lg">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Cargá tus productos",
    body: "Nombre, costo, precio y stock. NEXORA calcula el margen de cada uno al instante.",
  },
  {
    n: "02",
    title: "Registrá ventas y gastos",
    body: "Desde el mostrador o el celular. Cada operación actualiza stock, caja y resultados.",
  },
  {
    n: "03",
    title: "Decidí con información",
    body: "El dashboard, las alertas y las predicciones te dicen qué reponer, qué revisar y qué esperar.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 border-y border-border bg-surface/40 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Cómo funciona" title="De la carga a la decisión" />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="relative border-t border-border pt-6">
                <span className="absolute -top-px left-0 h-px w-12 bg-brand" aria-hidden />
                <p className="num text-sm text-brand">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden border-t border-border bg-black px-4 py-24 sm:px-8 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_120%,rgb(139_92_246/0.22),transparent_70%)]"
      />
      <Reveal className="relative mx-auto w-full max-w-[92rem]">
        <h2 className="display text-[19vw] sm:text-[clamp(5rem,13.5vw,15rem)]">
          Empezá hoy.
          <span className="mt-[0.16em] block text-brand">Mañana, números.</span>
        </h2>
        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-md text-lg text-muted">
            Creá tu cuenta gratis o recorré la demo con los datos de un almacén ficticio.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="display inline-flex h-14 w-full items-center justify-center border-2 border-brand bg-brand px-8 text-2xl text-black transition-colors hover:border-brand-bright hover:bg-brand-bright sm:w-auto"
            >
              Empezar gratis
            </Link>
            <form action={enterDemo} className="w-full sm:w-auto">
              <button
                type="submit"
                className="display inline-flex h-14 w-full cursor-pointer items-center justify-center border-2 border-fg px-8 text-2xl text-fg transition-colors hover:bg-fg hover:text-black"
              >
                Explorar demo
              </button>
            </form>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-muted">
            Gestión, análisis y predicción de ventas para pequeños y medianos comercios de Argentina.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-3 font-medium text-fg">Producto</p>
            <ul className="flex flex-col gap-2.5 text-muted">
              <li><Link href="/#caracteristicas" className="hover:text-fg">Características</Link></li>
              <li><Link href="/#como-funciona" className="hover:text-fg">Cómo funciona</Link></li>
              <li><Link href="/precios" className="hover:text-fg">Precios</Link></li>
              <li><Link href="/#preguntas" className="hover:text-fg">Preguntas frecuentes</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-medium text-fg">Cuenta</p>
            <ul className="flex flex-col gap-2.5 text-muted">
              <li><Link href="/login" className="hover:text-fg">Iniciar sesión</Link></li>
              <li><Link href="/registro" className="hover:text-fg">Crear cuenta</Link></li>
              <li><Link href="/recuperar" className="hover:text-fg">Recuperar contraseña</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-medium text-fg">Legal</p>
            <ul className="flex flex-col gap-2.5 text-muted">
              <li><Link href="/terminos" className="hover:text-fg">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-fg">Política de privacidad</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-border pt-6 text-xs text-subtle sm:flex-row sm:justify-between">
        <p>
          © 2026 NEXORA. Todos los derechos reservados. Diseñado y desarrollado por{" "}
          <a
            href="https://github.com/EzeGaona21"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Ezequiel Gaona
          </a>
          .
        </p>
        <p>Hecho en Argentina · Importes en pesos argentinos (ARS)</p>
      </div>
    </footer>
  );
}
