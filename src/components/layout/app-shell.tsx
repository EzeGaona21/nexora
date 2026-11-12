"use client";

import {
  Bell,
  ChartNoAxesColumn,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { signOut } from "@/actions/auth";
import { Logo } from "@/components/layout/logo";
import { overlay, slideInLeft, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "alerts";
}

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Operación",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/ventas", label: "Ventas", icon: ReceiptText },
      { href: "/productos", label: "Productos", icon: Package },
      { href: "/gastos", label: "Gastos", icon: Wallet },
    ],
  },
  {
    title: "Inteligencia",
    items: [
      { href: "/asistente", label: "NEXORA AI", icon: Sparkles },
      { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
      { href: "/predicciones", label: "Predicciones", icon: TrendingUp },
      { href: "/alertas", label: "Alertas", icon: Bell, badgeKey: "alerts" },
      { href: "/reportes", label: "Reportes", icon: FileText },
    ],
  },
  {
    title: "Cuenta",
    items: [
      { href: "/equipo", label: "Equipo", icon: Users },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  employee: "Empleado",
  demo: "Visitante",
};

export interface ShellProps {
  orgName: string;
  userName: string;
  userEmail: string;
  role: string;
  isDemo: boolean;
  stockAlerts: number;
  children: ReactNode;
}

function NavLinks({
  pathname,
  stockAlerts,
  layoutId,
  onNavigate,
}: {
  pathname: string;
  stockAlerts: number;
  layoutId: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-6" aria-label="Navegación principal">
      {NAV.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors duration-150",
                      active ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={layoutId}
                        className="absolute inset-0 rounded-lg border border-border bg-raised"
                        transition={transitions.spring}
                      />
                    ) : null}
                    <Icon
                      className={cn("relative size-4 shrink-0", active && "text-brand")}
                      aria-hidden
                    />
                    <span className="relative">{item.label}</span>
                    {item.badgeKey === "alerts" && stockAlerts > 0 ? (
                      <span
                        className="num relative ml-auto rounded-md bg-danger/15 px-1.5 py-0.5 text-[11px] font-medium text-danger"
                        aria-label={`${stockAlerts} productos con stock crítico`}
                      >
                        {stockAlerts}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ userName, userEmail, role }: Pick<ShellProps, "userName" | "userEmail" | "role">) {
  return (
    <div className="flex items-center gap-3 border-t border-border p-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-deep text-sm font-semibold text-brand-bright"
        aria-hidden
      >
        {userName.charAt(0).toUpperCase()}
      </div>
      <Link
        href="/perfil"
        className="group min-w-0 flex-1 rounded-md"
        aria-label={`Perfil de ${userName}`}
      >
        <p className="truncate text-sm font-medium text-fg transition-colors group-hover:text-brand-bright">
          {userName}
        </p>
        <p className="truncate text-xs text-subtle" title={userEmail}>
          {ROLE_LABELS[role] ?? role}
        </p>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function AppShell({ children, ...props }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cierra el menú mobile al navegar.
  useEffect(() => setOpen(false), [pathname]);

  const orgBlock = (
    <div className="mx-3 mb-5 rounded-lg border border-border bg-bg px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">Comercio</p>
      <p className="truncate text-sm font-medium text-fg">{props.orgName}</p>
    </div>
  );

  return (
    <div className="min-h-dvh">
      {/* Sidebar · desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-62 flex-col border-r border-border bg-surface/60 lg:flex print:!hidden">
        <Link href="/dashboard" className="flex h-16 items-center px-5" aria-label="NEXORA · inicio">
          <Logo />
        </Link>
        {orgBlock}
        <div className="flex-1 overflow-y-auto px-3">
          <NavLinks pathname={pathname} stockAlerts={props.stockAlerts} layoutId="nav-desktop" />
        </div>
        <UserBlock {...props} />
      </aside>

      {/* Barra superior · mobile */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden print:hidden">
        <Link href="/dashboard" aria-label="NEXORA · inicio">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Drawer · mobile */}
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
            <motion.div
              className="absolute inset-0 bg-black/65"
              variants={overlay}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface"
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex h-14 items-center justify-between px-4">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg"
                  aria-label="Cerrar menú"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-2">{orgBlock}</div>
              <div className="flex-1 overflow-y-auto px-3">
                <NavLinks
                  pathname={pathname}
                  stockAlerts={props.stockAlerts}
                  layoutId="nav-mobile"
                  onNavigate={() => setOpen(false)}
                />
              </div>
              <UserBlock {...props} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-62 print:!pl-0">
        {props.isDemo ? (
          <div className="no-print flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-brand/20 bg-brand/[0.07] px-4 py-2 text-center text-[13px] text-brand-bright">
            <span>Estás explorando la demo de solo lectura con datos de un comercio ficticio.</span>
            <form action={signOut} className="inline">
              <input type="hidden" name="next" value="/registro" />
              <button type="submit" className="cursor-pointer font-medium text-fg underline underline-offset-4 hover:text-brand-bright">
                Crear mi cuenta
              </button>
            </form>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
