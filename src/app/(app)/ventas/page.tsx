import { Plus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Badge, Card, EmptyState, PageHeader, TableShell, td, th } from "@/components/ui/primitives";
import { getSessionContext } from "@/lib/auth/session";
import { formatARS, formatDateTime, paymentLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SaleRow } from "@/types/db";

export const metadata: Metadata = { title: "Ventas" };

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "", label: "Todas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
];

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getSessionContext();

  const status = params.estado === "completed" || params.estado === "cancelled" ? params.estado : "";
  const page = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);

  let query = ctx.supabase
    .from("sales")
    .select(
      "id, number, status, subtotal, discount, total, units, payment_method, customer_name, created_at, cancelled_at",
      { count: "exact" },
    )
    .eq("org_id", ctx.org.id);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const sales = (data ?? []) as SaleRow[];

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Historial de operaciones de tu comercio."
        actions={
          <Link href="/ventas/nueva" className={buttonVariants()}>
            <Plus aria-hidden />
            Nueva venta
          </Link>
        }
      />

      <Card>
        <div className="flex gap-1 border-b border-border p-2" role="tablist" aria-label="Filtrar por estado">
          {STATUS_TABS.map((tab) => {
            const active = tab.value === status;
            return (
              <Link
                key={tab.value}
                href={tab.value ? `/ventas?estado=${tab.value}` : "/ventas"}
                role="tab"
                aria-selected={active}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-raised text-fg" : "text-muted hover:text-fg",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {sales.length === 0 ? (
          <EmptyState
            icon={<ReceiptText />}
            title={status ? "No hay ventas con ese estado" : "Todavía no registraste ventas"}
            description={
              status
                ? "Cambiá el filtro para ver el resto del historial."
                : "Registrá tu primera venta: el stock se descuenta solo y los indicadores empiezan a moverse."
            }
            action={
              status ? undefined : (
                <Link href="/ventas/nueva" className={buttonVariants()}>
                  <Plus aria-hidden />
                  Nueva venta
                </Link>
              )
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={th}>Comprobante</th>
                  <th scope="col" className={th}>Fecha</th>
                  <th scope="col" className={th}>Cliente</th>
                  <th scope="col" className={th}>Pago</th>
                  <th scope="col" className={cn(th, "text-right")}>Unidades</th>
                  <th scope="col" className={cn(th, "text-right")}>Total</th>
                  <th scope="col" className={th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-border transition-colors last:border-0 hover:bg-raised/50">
                    <td className={td}>
                      <Link href={`/ventas/${s.id}`} className="num font-medium text-fg underline-offset-4 hover:text-brand-bright hover:underline">
                        #{String(s.number).padStart(6, "0")}
                      </Link>
                    </td>
                    <td className={cn(td, "num whitespace-nowrap text-muted")}>{formatDateTime(s.created_at)}</td>
                    <td className={cn(td, "max-w-40 truncate text-muted")}>{s.customer_name ?? "—"}</td>
                    <td className={cn(td, "whitespace-nowrap text-muted")}>{paymentLabel(s.payment_method)}</td>
                    <td className={cn(td, "num text-right text-muted")}>{s.units}</td>
                    <td className={cn(td, "num text-right", s.status === "cancelled" && "text-subtle line-through")}>
                      {formatARS(s.total)}
                    </td>
                    <td className={td}>
                      {s.status === "cancelled" ? (
                        <Badge tone="danger">Cancelada</Badge>
                      ) : (
                        <Badge tone="success">Completada</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={count ?? 0}
              basePath="/ventas"
              params={{ estado: status }}
            />
          </>
        )}
      </Card>
    </>
  );
}
