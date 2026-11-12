"use client";

import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { createSale } from "@/actions/sales";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { Card, EmptyState } from "@/components/ui/primitives";
import { formatARS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/format";
import { listItem } from "@/lib/motion";
import { cn, DEMO_READONLY_MESSAGE } from "@/lib/utils";
import type { PosProduct } from "@/types/db";

type DiscountMode = "amount" | "percent";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function PointOfSale({ products, canWrite }: { products: PosProduct[]; canWrite: boolean }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discountMode, setDiscountMode] = useState<DiscountMode>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Una clave por intento de venta: si el envío se repite (doble clic, reintento
  // de red), el servidor reconoce la clave y no registra la venta dos veces.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = q
      ? products.filter(
          (p) =>
            normalize(p.name).includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode ?? "").includes(q),
        )
      : products;
    return list.slice(0, 40);
  }, [products, query]);

  const lines = Object.entries(cart)
    .map(([id, quantity]) => ({ product: byId.get(id), quantity }))
    .filter((l): l is { product: PosProduct; quantity: number } => Boolean(l.product));

  const subtotal = lines.reduce((a, l) => a + l.product.sale_price * l.quantity, 0);
  const rawDiscount = Number(discountValue.replace(",", ".")) || 0;
  const discount = Math.min(
    subtotal,
    Math.max(0, discountMode === "percent" ? Math.round(subtotal * rawDiscount) / 100 : rawDiscount),
  );
  const total = subtotal - discount;
  const units = lines.reduce((a, l) => a + l.quantity, 0);

  function setQuantity(product: PosProduct, quantity: number) {
    setCart((prev) => {
      const next = { ...prev };
      const clamped = Math.min(product.stock, Math.max(0, Math.floor(quantity)));
      if (clamped === 0) delete next[product.id];
      else next[product.id] = clamped;
      return next;
    });
  }

  function add(product: PosProduct) {
    const current = cart[product.id] ?? 0;
    if (current >= product.stock) {
      toast.info(`No hay más stock de ${product.name}.`);
      return;
    }
    setQuantity(product, current + 1);
  }

  // Lector de código de barras: Enter con coincidencia exacta agrega el producto.
  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = query.trim();
    const exact = products.find((p) => p.barcode === q || p.sku.toLowerCase() === q.toLowerCase());
    const target = exact ?? (results.length === 1 ? results[0] : undefined);
    if (target && target.stock > 0) {
      add(target);
      setQuery("");
    }
  }

  async function submit() {
    if (!canWrite) {
      toast.info(DEMO_READONLY_MESSAGE);
      return;
    }
    if (lines.length === 0 || submitting) return;
    setSubmitting(true);
    const result = await createSale({
      items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      discount,
      paymentMethod,
      customerName: customerName.trim(),
      idempotencyKey,
    });
    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error);
      // El servidor rechazó la venta (p. ej. cambió el stock): se traen datos frescos.
      router.refresh();
      return;
    }
    toast.success("Venta registrada");
    setIdempotencyKey(crypto.randomUUID());
    router.push(`/ventas/${result.data?.id}`);
  }

  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ShoppingCart />}
          title="No hay productos para vender"
          description="Cargá al menos un producto con stock para registrar una venta."
          action={
            <Link href="/productos" className={buttonVariants()}>
              Ir a productos
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
      {/* Catálogo */}
      <Card className="self-start">
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Buscar por nombre, SKU o escanear código de barras"
              aria-label="Buscar productos"
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
        {results.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">Ningún producto coincide con “{query}”.</p>
        ) : (
          <ul className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
            {results.map((p) => {
              const inCart = cart[p.id] ?? 0;
              const out = p.stock === 0;
              return (
                <li key={p.id}>
                  <motion.button
                    type="button"
                    onClick={() => add(p)}
                    disabled={out}
                    whileTap={out ? undefined : { scale: 0.98 }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      inCart > 0 ? "border-brand/40 bg-brand/[0.06]" : "border-border bg-bg hover:border-border-strong",
                      out && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="num block text-xs text-subtle">
                        {p.sku} · {out ? "Sin stock" : `${p.stock} disp.`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="num text-sm">{formatARS(p.sale_price)}</span>
                      {inCart > 0 ? (
                        <span className="num flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-bg">
                          {inCart}
                        </span>
                      ) : null}
                    </span>
                  </motion.button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Pedido */}
      <Card className="flex flex-col self-start lg:sticky lg:top-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold">Pedido</h2>
          <span className="num text-xs text-muted">
            {units} {units === 1 ? "unidad" : "unidades"}
          </span>
        </div>

        {lines.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Tocá un producto para agregarlo al pedido.
          </p>
        ) : (
          <ul className="max-h-[38vh] divide-y divide-border overflow-y-auto px-5">
            <AnimatePresence initial={false}>
              {lines.map(({ product, quantity }) => (
                <motion.li
                  key={product.id}
                  variants={listItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout="position"
                  className="py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm">{product.name}</p>
                    <p className="num shrink-0 text-sm">{formatARS(product.sale_price * quantity)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-8"
                        aria-label={`Quitar una unidad de ${product.name}`}
                        onClick={() => setQuantity(product, quantity - 1)}
                      >
                        <Minus />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => setQuantity(product, Number(e.target.value) || 0)}
                        aria-label={`Cantidad de ${product.name}`}
                        className="num h-8 w-14 px-1 text-center"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-8"
                        aria-label={`Agregar una unidad de ${product.name}`}
                        disabled={quantity >= product.stock}
                        onClick={() => setQuantity(product, quantity + 1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Quitar ${product.name} del pedido`}
                      onClick={() => setQuantity(product, 0)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <div className="flex flex-col gap-4 border-t border-border p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pos-payment">Método de pago</Label>
              <Select
                id="pos-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pos-discount">Descuento</Label>
              <div className="flex">
                <Input
                  id="pos-discount"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder="0"
                  className="num rounded-r-none"
                />
                <button
                  type="button"
                  onClick={() => setDiscountMode(discountMode === "percent" ? "amount" : "percent")}
                  className="num w-11 shrink-0 cursor-pointer rounded-r-lg border border-l-0 border-border bg-raised text-sm text-muted transition-colors hover:text-fg"
                  aria-label={`Descuento en ${discountMode === "percent" ? "porcentaje" : "pesos"}. Tocar para cambiar.`}
                >
                  {discountMode === "percent" ? "%" : "$"}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos-customer">Cliente (opcional)</Label>
            <Input
              id="pos-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={80}
              autoComplete="off"
            />
          </div>

          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-muted">
              <dt>Subtotal</dt>
              <dd className="num">{formatARS(subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-muted">
                <dt>Descuento</dt>
                <dd className="num">− {formatARS(discount)}</dd>
              </div>
            ) : null}
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="num text-2xl font-semibold tracking-tight">{formatARS(total)}</dd>
            </div>
          </dl>

          <Button size="lg" loading={submitting} disabled={lines.length === 0} onClick={submit}>
            Registrar venta
          </Button>
        </div>
      </Card>
    </div>
  );
}
