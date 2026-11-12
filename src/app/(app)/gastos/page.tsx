import type { Metadata } from "next";

import { ExpensesView } from "@/components/expenses/expenses-view";
import { getSessionContext } from "@/lib/auth/session";
import { fetchDailySales } from "@/lib/data/insights";
import { addMonths, endOfMonth, startOfMonth, todayAR } from "@/lib/dates";
import type { ExpenseRow } from "@/types/db";

export const metadata: Metadata = { title: "Gastos" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  const today = todayAR();

  // ?mes=YYYY-MM · por defecto, el mes en curso. Nunca un mes futuro.
  const requested = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.mes ?? "") ? `${params.mes}-01` : startOfMonth(today);
  const monthStart = requested > startOfMonth(today) ? startOfMonth(today) : requested;
  const monthEnd = endOfMonth(monthStart);
  const rangeEnd = monthEnd > today ? today : monthEnd;

  const [expensesRes, daily] = await Promise.all([
    ctx.supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date, payment_method")
      .eq("org_id", ctx.org.id)
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    fetchDailySales(ctx, monthStart, rangeEnd),
  ]);
  if (expensesRes.error) throw new Error(expensesRes.error.message);

  const revenue = daily.reduce((a, d) => a + d.revenue, 0);
  const cost = daily.reduce((a, d) => a + d.cost, 0);

  // Últimos 12 meses para el selector.
  const months = Array.from({ length: 12 }, (_, i) => addMonths(today, -i).slice(0, 7));

  return (
    <ExpensesView
      expenses={(expensesRes.data ?? []) as ExpenseRow[]}
      month={monthStart.slice(0, 7)}
      months={months}
      today={today}
      revenue={revenue}
      cost={cost}
      canWrite={ctx.canWrite}
      isAdmin={ctx.isAdmin}
    />
  );
}
