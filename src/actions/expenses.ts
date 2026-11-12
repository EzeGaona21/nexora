"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, getSessionContext } from "@/lib/auth/session";
import { DEMO_READONLY_MESSAGE, type ActionResult } from "@/lib/utils";
import { expenseSchema, firstIssue, type ExpenseInput } from "@/lib/validations/schemas";

function revalidateExpenses() {
  for (const path of ["/gastos", "/dashboard", "/alertas"]) revalidatePath(path);
}

export async function createExpense(input: ExpenseInput): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const { error } = await ctx.supabase.from("expenses").insert({
    org_id: ctx.org.id,
    category: v.category,
    description: v.description,
    amount: v.amount,
    expense_date: v.expenseDate,
    payment_method: v.paymentMethod,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidateExpenses();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };
  if (!ctx.isAdmin) return { ok: false, error: "Solo un administrador puede eliminar gastos." };

  const { error } = await ctx.supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidateExpenses();
  return { ok: true };
}
