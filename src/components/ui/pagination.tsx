import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Paginación por URL (?pagina=N): funciona con el botón atrás y se puede compartir. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  /** Filtros actuales a conservar en los enlaces. */
  params: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("pagina", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass = buttonVariants({ variant: "secondary", size: "sm" });
  const disabledClass = "pointer-events-none opacity-40";

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-border px-4 py-3"
      aria-label="Paginación"
    >
      <p className="num text-xs text-muted">
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={href(page - 1)}
          className={cn(linkClass, page <= 1 && disabledClass)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
        >
          <ChevronLeft aria-hidden />
          Anterior
        </Link>
        <Link
          href={href(page + 1)}
          className={cn(linkClass, page >= pages && disabledClass)}
          aria-disabled={page >= pages}
          tabIndex={page >= pages ? -1 : undefined}
        >
          Siguiente
          <ChevronRight aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
