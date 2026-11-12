"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Package, Pencil, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { archiveProduct, saveProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Badge, Card, EmptyState, PageHeader, TableShell, td, th } from "@/components/ui/primitives";
import { formatARS, formatPct, marginPct } from "@/lib/format";
import { listItem } from "@/lib/motion";
import { cn, DEMO_READONLY_MESSAGE } from "@/lib/utils";
import { productSchema, type ProductInput } from "@/lib/validations/schemas";
import type { ProductRow } from "@/types/db";

interface Named {
  id: string;
  name: string;
}

interface Filters {
  q: string;
  categoryId: string;
  stock: string;
}

const EMPTY_FORM: ProductInput = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  supplier: "",
  costPrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: 0,
  imageUrl: "",
};

function toForm(p: ProductRow): ProductInput {
  return {
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? "",
    category: p.category?.name ?? "",
    supplier: p.supplier?.name ?? "",
    costPrice: p.cost_price,
    salePrice: p.sale_price,
    stock: p.stock,
    minStock: p.min_stock,
    imageUrl: p.image_url ?? "",
  };
}

function ProductForm({
  product,
  categories,
  suppliers,
  onDone,
}: {
  product: ProductRow | null;
  categories: Named[];
  suppliers: Named[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? toForm(product) : EMPTY_FORM,
  });
  const { errors, isSubmitting } = form.formState;
  const cost = form.watch("costPrice");
  const price = form.watch("salePrice");
  const margin = Number.isFinite(cost) && Number.isFinite(price) && price > 0 ? marginPct(cost, price) : null;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await saveProduct(product?.id ?? null, values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(product ? "Producto actualizado" : "Producto creado");
    onDone();
  });

  const numeric = { valueAsNumber: true } as const;

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4" noValidate>
      {error ? (
        <p role="alert" className="col-span-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <Field label="Nombre" error={errors.name?.message} className="col-span-2">
        {(a) => <Input {...a} {...form.register("name")} />}
      </Field>
      <Field label="SKU" error={errors.sku?.message}>
        {(a) => <Input className="num" {...a} {...form.register("sku")} />}
      </Field>
      <Field label="Código de barras" error={errors.barcode?.message}>
        {(a) => <Input className="num" inputMode="numeric" {...a} {...form.register("barcode")} />}
      </Field>
      <Field label="Categoría" error={errors.category?.message} hint="Elegí una o escribí una nueva.">
        {(a) => <Input list="product-categories" {...a} {...form.register("category")} />}
      </Field>
      <Field label="Proveedor" error={errors.supplier?.message}>
        {(a) => <Input list="product-suppliers" {...a} {...form.register("supplier")} />}
      </Field>
      <datalist id="product-categories">
        {categories.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <datalist id="product-suppliers">
        {suppliers.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>

      <Field label="Precio de compra ($)" error={errors.costPrice?.message}>
        {(a) => <Input type="number" step="0.01" min="0" inputMode="decimal" className="num" {...a} {...form.register("costPrice", numeric)} />}
      </Field>
      <Field label="Precio de venta ($)" error={errors.salePrice?.message}>
        {(a) => <Input type="number" step="0.01" min="0" inputMode="decimal" className="num" {...a} {...form.register("salePrice", numeric)} />}
      </Field>

      <div className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5 text-sm">
        <span className="text-muted">Margen sobre precio de venta</span>
        <span
          className={cn(
            "num font-medium",
            margin === null ? "text-subtle" : margin < 0 ? "text-danger" : margin < 15 ? "text-warning" : "text-brand-bright",
          )}
        >
          {margin === null ? "—" : formatPct(margin)}
        </span>
      </div>

      <Field
        label={product ? "Stock disponible" : "Stock inicial"}
        error={errors.stock?.message}
        hint={product ? "Si lo cambiás queda registrado como ajuste." : undefined}
      >
        {(a) => <Input type="number" step="1" min="0" inputMode="numeric" className="num" {...a} {...form.register("stock", numeric)} />}
      </Field>
      <Field label="Stock mínimo" error={errors.minStock?.message} hint="Te avisamos al llegar a este nivel.">
        {(a) => <Input type="number" step="1" min="0" inputMode="numeric" className="num" {...a} {...form.register("minStock", numeric)} />}
      </Field>
      <Field label="Imagen (URL)" error={errors.imageUrl?.message} className="col-span-2" hint="Opcional. Enlace https:// a una imagen del producto.">
        {(a) => <Input type="url" placeholder="https://…" {...a} {...form.register("imageUrl")} />}
      </Field>

      <div className="col-span-2 mt-2 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}

function Thumb({ product }: { product: ProductRow }) {
  return product.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- URLs externas arbitrarias del comercio
    <img
      src={product.image_url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-9 shrink-0 rounded-lg border border-border object-cover"
    />
  ) : (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-raised text-subtle" aria-hidden>
      <Package className="size-4" />
    </div>
  );
}

export function ProductsView({
  products,
  total,
  page,
  pageSize,
  categories,
  suppliers,
  filters,
  canWrite,
  isAdmin,
}: {
  products: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  categories: Named[];
  suppliers: Named[];
  filters: Filters;
  canWrite: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<ProductRow | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  function applyFilters(next: Partial<Filters>) {
    const merged = { ...filters, ...next };
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.categoryId) sp.set("categoria", merged.categoryId);
    if (merged.stock) sp.set("stock", merged.stock);
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  // Búsqueda con espera: no consulta en cada tecla.
  useEffect(() => {
    if (search === filters.q) return;
    const timer = setTimeout(() => applyFilters({ q: search.trim() }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function requireWrite(action: () => void) {
    if (!canWrite) {
      toast.info(DEMO_READONLY_MESSAGE);
      return;
    }
    action();
  }

  async function confirmArchive() {
    if (!archiving) return;
    setArchiveBusy(true);
    const result = await archiveProduct(archiving.id);
    setArchiveBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Producto archivado");
    setArchiving(null);
  }

  const hasFilters = Boolean(filters.q || filters.categoryId || filters.stock);

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo, precios, márgenes y stock de tu comercio."
        actions={
          <Button onClick={() => requireWrite(() => setCreating(true))}>
            <Plus aria-hidden />
            Nuevo producto
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o código de barras"
              aria-label="Buscar productos"
              className="pl-9"
            />
          </div>
          <Select
            value={filters.categoryId}
            onChange={(e) => applyFilters({ categoryId: e.target.value })}
            aria-label="Filtrar por categoría"
            className="sm:w-48"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.stock}
            onChange={(e) => applyFilters({ stock: e.target.value })}
            aria-label="Filtrar por stock"
            className="sm:w-44"
          >
            <option value="">Todo el stock</option>
            <option value="bajo">Stock bajo</option>
            <option value="sin">Sin stock</option>
          </Select>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={hasFilters ? "Ningún producto coincide" : "Todavía no cargaste productos"}
            description={
              hasFilters
                ? "Probá con otra búsqueda o quitá los filtros."
                : "Cargá tu primer producto con su costo y precio para empezar a vender y medir tu margen."
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    applyFilters({ q: "", categoryId: "", stock: "" });
                  }}
                >
                  Quitar filtros
                </Button>
              ) : (
                <Button onClick={() => requireWrite(() => setCreating(true))}>
                  <Plus aria-hidden />
                  Nuevo producto
                </Button>
              )
            }
          />
        ) : (
          <div className={cn("transition-opacity duration-150", isPending && "opacity-50")}>
            <TableShell>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={th}>Producto</th>
                  <th scope="col" className={th}>Categoría</th>
                  <th scope="col" className={cn(th, "text-right")}>Costo</th>
                  <th scope="col" className={cn(th, "text-right")}>Precio</th>
                  <th scope="col" className={cn(th, "text-right")}>Margen</th>
                  <th scope="col" className={cn(th, "text-right")}>Stock</th>
                  <th scope="col" className={cn(th, "text-right")}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {products.map((p) => {
                    const margin = marginPct(p.cost_price, p.sale_price);
                    return (
                      <motion.tr
                        key={p.id}
                        layout="position"
                        variants={listItem}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="border-b border-border transition-colors last:border-0 hover:bg-raised/50"
                      >
                        <td className={td}>
                          <div className="flex items-center gap-3">
                            <Thumb product={p} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{p.name}</p>
                              <p className="num truncate text-xs text-subtle">
                                {p.sku}
                                {p.barcode ? ` · ${p.barcode}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={cn(td, "text-muted")}>{p.category?.name ?? "—"}</td>
                        <td className={cn(td, "num text-right text-muted")}>{formatARS(p.cost_price)}</td>
                        <td className={cn(td, "num text-right")}>{formatARS(p.sale_price)}</td>
                        <td className={cn(td, "num text-right", margin < 0 ? "text-danger" : margin < 15 ? "text-warning" : "text-muted")}>
                          {formatPct(margin)}
                        </td>
                        <td className={cn(td, "text-right")}>
                          {p.stock === 0 ? (
                            <Badge tone="danger">Sin stock</Badge>
                          ) : p.is_low_stock ? (
                            <Badge tone="warning">
                              <span className="num">{p.stock}</span> · bajo
                            </Badge>
                          ) : (
                            <span className="num">{p.stock}</span>
                          )}
                        </td>
                        <td className={cn(td, "text-right")}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${p.name}`}
                              onClick={() => requireWrite(() => setEditing(p))}
                            >
                              <Pencil />
                            </Button>
                            {isAdmin ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Archivar ${p.name}`}
                                onClick={() => setArchiving(p)}
                              >
                                <Archive />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </TableShell>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              basePath="/productos"
              params={{ q: filters.q, categoria: filters.categoryId, stock: filters.stock }}
            />
          </div>
        )}
      </Card>

      <Modal
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        title={editing ? "Editar producto" : "Nuevo producto"}
        description={editing ? editing.name : "Completá los datos del producto."}
        size="lg"
      >
        <ProductForm
          key={editing?.id ?? "new"}
          product={editing}
          categories={categories}
          suppliers={suppliers}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={archiving !== null}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
        title="Archivar producto"
        description="Deja de aparecer en el catálogo y en el punto de venta. Su historial de ventas se conserva."
        size="sm"
      >
        <p className="text-sm">
          ¿Archivar <span className="font-medium">{archiving?.name}</span>?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setArchiving(null)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={archiveBusy} onClick={confirmArchive}>
            Archivar
          </Button>
        </div>
      </Modal>
    </>
  );
}
