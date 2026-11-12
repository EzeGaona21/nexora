import type { Metadata } from "next";

import { ProductsView } from "@/components/products/products-view";
import { getSessionContext } from "@/lib/auth/session";
import type { ProductRow } from "@/types/db";

export const metadata: Metadata = { title: "Productos" };

const PAGE_SIZE = 20;

/** Quita los caracteres con significado en los filtros de PostgREST. */
function sanitizeSearch(q: string) {
  return q.replace(/[,()%*\\"':]/g, " ").trim().slice(0, 60);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; stock?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getSessionContext();

  const q = sanitizeSearch(params.q ?? "");
  const categoryId = /^[0-9a-f-]{36}$/i.test(params.categoria ?? "") ? params.categoria! : "";
  const stock = params.stock === "bajo" || params.stock === "sin" ? params.stock : "";
  const page = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);

  let query = ctx.supabase
    .from("products")
    .select(
      "id, name, sku, barcode, cost_price, sale_price, stock, min_stock, is_low_stock, image_url, category:categories (id, name), supplier:suppliers (id, name)",
      { count: "exact" },
    )
    .eq("org_id", ctx.org.id)
    .eq("is_active", true);

  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (stock === "bajo") query = query.eq("is_low_stock", true);
  if (stock === "sin") query = query.eq("stock", 0);

  const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
    query.order("name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    ctx.supabase.from("categories").select("id, name").eq("org_id", ctx.org.id).order("name"),
    ctx.supabase.from("suppliers").select("id, name").eq("org_id", ctx.org.id).order("name"),
  ]);
  if (productsRes.error) throw new Error(productsRes.error.message);

  return (
    <ProductsView
      products={(productsRes.data ?? []) as unknown as ProductRow[]}
      total={productsRes.count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      categories={(categoriesRes.data ?? []) as { id: string; name: string }[]}
      suppliers={(suppliersRes.data ?? []) as { id: string; name: string }[]}
      filters={{ q, categoryId, stock }}
      canWrite={ctx.canWrite}
      isAdmin={ctx.isAdmin}
    />
  );
}
