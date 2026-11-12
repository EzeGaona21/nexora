import { NextResponse, type NextRequest } from "next/server";

import { formatDateTime, paymentLabel } from "@/lib/format";
import { receiptToPdf } from "@/lib/reports/pdf";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Comprobante interno en PDF. RLS garantiza que la venta sea del comercio del usuario. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Venta inexistente" }, { status: 404 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [saleRes, itemsRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, number, status, subtotal, discount, total, payment_method, customer_name, created_at, organizations (name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("sale_items")
      .select("product_name, quantity, unit_price, line_total")
      .eq("sale_id", id)
      .order("product_name"),
  ]);
  if (saleRes.error || itemsRes.error) {
    return NextResponse.json({ error: "No pudimos generar el comprobante" }, { status: 500 });
  }
  const sale = saleRes.data;
  if (!sale) return NextResponse.json({ error: "Venta inexistente" }, { status: 404 });
  const org = sale.organizations as unknown as { name: string } | null;

  const pdf = await receiptToPdf({
    orgName: org?.name ?? "Comercio",
    number: Number(sale.number),
    issuedAt: formatDateTime(String(sale.created_at)),
    cancelled: sale.status === "cancelled",
    paymentLabel: paymentLabel(String(sale.payment_method)),
    customerName: sale.customer_name ? String(sale.customer_name) : null,
    items: (itemsRes.data ?? []).map((i) => ({
      name: String(i.product_name),
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.line_total),
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    total: Number(sale.total),
  });

  const number = String(sale.number).padStart(6, "0");
  return new NextResponse(new Uint8Array(pdf).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="comprobante-${number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
