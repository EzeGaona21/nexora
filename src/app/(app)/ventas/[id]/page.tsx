import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SaleActions } from "@/components/sales/sale-actions";
import { Badge } from "@/components/ui/primitives";
import { getSessionContext } from "@/lib/auth/session";
import { formatARSPrecise, formatDateTime, paymentLabel } from "@/lib/format";
import type { SaleItemRow, SaleRow } from "@/types/db";

export const metadata: Metadata = { title: "Comprobante de venta" };

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const ctx = await getSessionContext();
  const [saleRes, itemsRes] = await Promise.all([
    ctx.supabase
      .from("sales")
      .select(
        "id, number, status, subtotal, discount, total, units, payment_method, customer_name, created_at, cancelled_at",
      )
      .eq("id", id)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    ctx.supabase
      .from("sale_items")
      .select("id, product_name, quantity, unit_price, line_total")
      .eq("sale_id", id)
      .eq("org_id", ctx.org.id)
      .order("product_name"),
  ]);
  if (saleRes.error) throw new Error(saleRes.error.message);
  // RLS hace que una venta de otro comercio sea indistinguible de una inexistente.
  if (!saleRes.data) notFound();

  const sale = saleRes.data as SaleRow;
  const items = (itemsRes.data ?? []) as SaleItemRow[];
  const number = String(sale.number).padStart(6, "0");
  const cancelled = sale.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/ventas" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden />
          Volver a ventas
        </Link>
        <SaleActions
          saleId={sale.id}
          number={sale.number}
          canCancel={!cancelled && ctx.isAdmin}
          cancelHint={
            cancelled || ctx.isAdmin
              ? null
              : ctx.org.is_demo
                ? "La demo no permite cancelar ventas."
                : "Solo un administrador puede cancelar ventas."
          }
        />
      </div>

      <article className="card print-area p-6 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-lg font-semibold tracking-tight">{ctx.org.name}</p>
            <p className="mt-1 text-xs text-muted">Comprobante interno · No válido como factura</p>
          </div>
          <div className="text-right">
            <p className="num text-lg font-semibold">#{number}</p>
            <p className="num mt-1 text-xs text-muted">{formatDateTime(sale.created_at)}</p>
            {cancelled ? (
              <Badge tone="danger" className="mt-2">
                Cancelada{sale.cancelled_at ? ` · ${formatDateTime(sale.cancelled_at)}` : ""}
              </Badge>
            ) : null}
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-4 border-b border-border py-5 text-sm">
          <div>
            <dt className="text-xs text-muted">Cliente</dt>
            <dd className="mt-0.5">{sale.customer_name ?? "Consumidor final"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Método de pago</dt>
            <dd className="mt-0.5">{paymentLabel(sale.payment_method)}</dd>
          </div>
        </dl>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th scope="col" className="py-3 text-left font-medium">Producto</th>
              <th scope="col" className="py-3 text-right font-medium">Cant.</th>
              <th scope="col" className="py-3 text-right font-medium">P. unitario</th>
              <th scope="col" className="py-3 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-3 pr-3">{item.product_name}</td>
                <td className="num py-3 text-right">{item.quantity}</td>
                <td className="num py-3 text-right text-muted">{formatARSPrecise(item.unit_price)}</td>
                <td className="num py-3 text-right">{formatARSPrecise(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-5 flex w-full max-w-64 flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <dt>Subtotal</dt>
            <dd className="num">{formatARSPrecise(sale.subtotal)}</dd>
          </div>
          {sale.discount > 0 ? (
            <div className="flex justify-between text-muted">
              <dt>Descuento</dt>
              <dd className="num">− {formatARSPrecise(sale.discount)}</dd>
            </div>
          ) : null}
          <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="num text-xl font-semibold">{formatARSPrecise(sale.total)}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
