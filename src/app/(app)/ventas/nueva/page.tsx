import type { Metadata } from "next";

import { PointOfSale } from "@/components/sales/point-of-sale";
import { PageHeader } from "@/components/ui/primitives";
import { getSessionContext } from "@/lib/auth/session";
import type { PosProduct } from "@/types/db";

export const metadata: Metadata = { title: "Nueva venta" };

export default async function NewSalePage() {
  const ctx = await getSessionContext();

  const { data, error } = await ctx.supabase
    .from("products")
    .select("id, name, sku, barcode, sale_price, stock")
    .eq("org_id", ctx.org.id)
    .eq("is_active", true)
    .order("name")
    .limit(1000);
  if (error) throw new Error(error.message);

  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="Buscá productos, armá el pedido y confirmá. El stock se descuenta al registrar."
      />
      <PointOfSale products={(data ?? []) as PosProduct[]} canWrite={ctx.canWrite} />
    </>
  );
}
