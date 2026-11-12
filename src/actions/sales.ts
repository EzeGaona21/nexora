"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, getSessionContext } from "@/lib/auth/session";
import { DEMO_READONLY_MESSAGE, type ActionResult } from "@/lib/utils";
import { firstIssue, saleSchema, type SaleInput } from "@/lib/validations/schemas";

function revalidateSales() {
  for (const path of ["/ventas", "/dashboard", "/productos", "/predicciones", "/alertas", "/gastos"]) {
    revalidatePath(path);
  }
}

/**
 * Registra una venta. La action solo valida forma y permisos; la operación
 * real es la función SQL create_sale, que corre en una transacción: bloquea
 * los productos, verifica stock, toma precios de la base y descuenta una sola
 * vez. Reenviar la misma idempotencyKey devuelve la venta original.
 */
export async function createSale(input: SaleInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };

  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const { data, error } = await ctx.supabase.rpc("create_sale", {
    p_org: ctx.org.id,
    p_items: v.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_discount: v.discount,
    p_payment_method: v.paymentMethod,
    p_customer_name: v.customerName,
    p_idempotency_key: v.idempotencyKey,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidateSales();
  return { ok: true, data: { id: data as string } };
}

/** Cancela una venta y devuelve el stock, en una única transacción (cancel_sale). */
export async function cancelSale(saleId: string): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };
  if (!/^[0-9a-f-]{36}$/i.test(saleId)) return { ok: false, error: "Venta inválida." };

  const { error } = await ctx.supabase.rpc("cancel_sale", { p_sale: saleId });
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidateSales();
  return { ok: true };
}
