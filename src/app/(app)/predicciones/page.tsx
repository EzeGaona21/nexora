import type { Metadata } from "next";

import { ForecastView } from "@/components/forecast/forecast-view";
import { getSessionContext } from "@/lib/auth/session";
import { fetchDailySales, fetchInsights } from "@/lib/data/insights";
import { addDays, todayAR } from "@/lib/dates";
import { forecastSales, type ProductDemand } from "@/lib/forecast/forecast";

export const metadata: Metadata = { title: "Predicciones" };

const HISTORY_DAYS = 180;
const WINDOW_DAYS = 30;
const MAX_HORIZON = 30;

export default async function ForecastPage() {
  const ctx = await getSessionContext();
  const today = todayAR();
  // El día en curso está incompleto: el modelo se entrena hasta ayer inclusive.
  const yesterday = addDays(today, -1);

  const [daily, insights] = await Promise.all([
    fetchDailySales(ctx, addDays(yesterday, -(HISTORY_DAYS - 1)), yesterday),
    fetchInsights(ctx, WINDOW_DAYS),
  ]);

  const series = daily.map((d) => ({ date: d.date, value: d.revenue }));
  const forecast = forecastSales(series, MAX_HORIZON);

  const products: ProductDemand[] = insights.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    unitsWindow: p.units_window,
    unitsPrevWindow: p.units_prev_window,
  }));

  return (
    <ForecastView
      history={series.slice(-45)}
      forecast={forecast}
      products={products}
      windowDays={WINDOW_DAYS}
      lastDay={yesterday}
    />
  );
}
