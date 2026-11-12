"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, getSessionContext } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import { DEMO_READONLY_MESSAGE, type ActionResult } from "@/lib/utils";
import { firstIssue, productSchema, type ProductInput } from "@/lib/validations/schemas";

type Ctx = Awaited<ReturnType<typeof getSessionContext>>;

/** Devuelve el id de la categoría/proveedor con ese nombre, creándolo si no existe. */
async function resolveNamed(
  ctx: Ctx,
  table: "categories" | "suppliers",
  name: string,
): Promise<string | null> {
  if (!name) return null;
  const { data: existing } = await ctx.supabase
    .from(table)
    .select("id")
    .eq("org_id", ctx.org.id)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await ctx.supabase
    .from(table)
    .insert({ org_id: ctx.org.id, name })
    .select("id")
    .single();
  if (error) throw new Error(dbErrorMessage(error));
  return created.id as string;
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  if (id === null) {
    // Límite del plan, validado en servidor.
    const limit = getPlan(ctx.org.plan).limits.products;
    if (limit !== null) {
      const { count } = await ctx.supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("org_id", ctx.org.id)
        .eq("is_active", true);
      if ((count ?? 0) >= limit) {
        return {
          ok: false,
          error: `Tu plan permite hasta ${limit} productos activos. Archivá alguno o pasá a un plan mayor.`,
        };
      }
    }
  }

  let categoryId: string | null;
  let supplierId: string | null;
  try {
    [categoryId, supplierId] = await Promise.all([
      resolveNamed(ctx, "categories", v.category),
      resolveNamed(ctx, "suppliers", v.supplier),
    ]);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo guardar la categoría." };
  }

  const row = {
    name: v.name,
    sku: v.sku,
    barcode: v.barcode || null,
    category_id: categoryId,
    supplier_id: supplierId,
    cost_price: v.costPrice,
    sale_price: v.salePrice,
    stock: v.stock,
    min_stock: v.minStock,
    image_url: v.imageUrl || null,
  };

  const { error } =
    id === null
      ? await ctx.supabase.from("products").insert({ ...row, org_id: ctx.org.id })
      : await ctx.supabase.from("products").update(row).eq("id", id).eq("org_id", ctx.org.id);

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Ya existe un producto con ese SKU." : dbErrorMessage(error),
    };
  }

  revalidatePath("/productos");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Archiva el producto: deja de venderse pero conserva su historial. */
export async function archiveProduct(id: string): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };
  if (!ctx.isAdmin) return { ok: false, error: "Solo un administrador puede archivar productos." };

  const { error } = await ctx.supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidatePath("/productos");
  revalidatePath("/dashboard");
  return { ok: true };
}
