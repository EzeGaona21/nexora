import type { Metadata } from "next";

import { AlertsView } from "@/components/alerts/alerts-view";
import { generateAlerts } from "@/lib/alerts/rules";
import { getSessionContext } from "@/lib/auth/session";
import { fetchDailySales, fetchExpensesSummary, fetchInsights } from "@/lib/data/insights";
import { addDays, addMonths, startOfMonth, todayAR } from "@/lib/dates";

export const metadata: Metadata = { title: "Alertas" };

const WINDOW_DAYS = 30;

export default async function AlertsPage() {
  const ctx = await getSessionContext();
  const today = todayAR();
  const monthStart = startOfMonth(today);

  const [insights, daily, expensesCurrent, expensesPrevious] = await Promise.all([
    fetchInsights(ctx, WINDOW_DAYS),
    fetchDailySales(ctx, addDays(today, -15), today),
    fetchExpensesSummary(ctx, monthStart, today),
    // Los 3 meses completos anteriores al actual.
    fetchExpensesSummary(ctx, addMonths(today, -3), addDays(monthStart, -1)),
  ]);

  const alerts = generateAlerts({
    today,
    windowDays: WINDOW_DAYS,
    products: insights,
    daily: daily.map((d) => ({ date: d.date, revenue: d.revenue })),
    expensesCurrent: expensesCurrent.map((e) => ({ category: e.category, total: e.total })),
    expensesBaseline: expensesPrevious.map((e) => ({ category: e.category, monthlyAvg: e.total / 3 })),
  });

  return <AlertsView alerts={alerts} hasData={insights.length > 0} />;
}
