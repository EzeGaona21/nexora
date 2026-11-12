import type { PaymentMethod } from "@/lib/format";

export type MemberRole = "admin" | "employee" | "demo";
export type PlanTier = "free" | "pro" | "business";
export type SaleStatus = "completed" | "cancelled";

export interface Organization {
  id: string;
  name: string;
  business_type: string;
  plan: PlanTier;
  is_demo: boolean;
}

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  is_low_stock: boolean;
  image_url: string | null;
  category: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
}

export interface SaleRow {
  id: string;
  number: number;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  total: number;
  units: number;
  payment_method: PaymentMethod;
  customer_name: string | null;
  created_at: string;
  cancelled_at: string | null;
}

export interface SaleItemRow {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ExpenseRow {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
}

/** Producto mínimo para el punto de venta. */
export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  sale_price: number;
  stock: number;
}
