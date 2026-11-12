/**
 * Predicción de ventas diarias — módulo puro y determinístico.
 *
 * El modelo se elige según cuánta historia hay:
 *   < 14 días   → sin predicción (datos insuficientes)
 *   14–27 días  → media móvil de 7 días
 *   28–55 días  → tendencia lineal + estacionalidad por día de semana
 *   ≥ 56 días   → Holt-Winters aditivo (período 7) con tendencia amortiguada
 *
 * La precisión se mide con un backtest: se ocultan los últimos días, se
 * predicen con el resto y se compara contra lo real. De ese error sale la
 * banda de incertidumbre. No hay ningún valor aleatorio.
 */

import { addDays, weekdayOf } from "../dates.ts";

export interface DailyPoint {
  date: string;
  value: number;
}

export type ForecastMethod =
  | "insufficient"
  | "moving_average"
  | "seasonal_trend"
  | "holt_winters";

export interface ForecastPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastAccuracy {
  /** Error absoluto medio del backtest, en la unidad de la serie. */
  mae: number;
  /** Error porcentual absoluto medio (null si no se puede calcular). */
  mape: number | null;
  holdoutDays: number;
}

export interface ForecastResult {
  method: ForecastMethod;
  methodLabel: string;
  sufficient: boolean;
  message: string | null;
  historyDays: number;
  points: ForecastPoint[];
  /** Predicciones del backtest sobre días que ya ocurrieron. */
  backtest: DailyPoint[];
  accuracy: ForecastAccuracy | null;
  trend: { direction: "up" | "down" | "flat"; weeklyChangePct: number } | null;
  /** Índice por día de semana (1 = día promedio). null sin datos suficientes. */
  seasonality: { weekday: number; index: number }[] | null;
}

export const MIN_HISTORY_DAYS = 14;
const SEASONAL_MIN_DAYS = 28;
const HOLT_WINTERS_MIN_DAYS = 56;
const PERIOD = 7;
/** z de una normal para un intervalo del 80 %. */
const Z80 = 1.2816;

const METHOD_LABELS: Record<ForecastMethod, string> = {
  insufficient: "Sin datos suficientes",
  moving_average: "Media móvil de 7 días",
  seasonal_trend: "Tendencia lineal con estacionalidad semanal",
  holt_winters: "Holt-Winters aditivo (estacionalidad semanal)",
};

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function movingAverage(values: number[], window: number): number {
  return mean(values.slice(-window));
}

export function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

/** Índices multiplicativos por día de semana (promedio del día / promedio general). */
export function weekdayIndices(values: number[], weekdays: number[]): number[] {
  const overall = mean(values);
  const sums = new Array<number>(PERIOD).fill(0);
  const counts = new Array<number>(PERIOD).fill(0);
  values.forEach((v, i) => {
    sums[weekdays[i]] += v;
    counts[weekdays[i]] += 1;
  });
  return sums.map((s, d) => (overall > 0 && counts[d] > 0 ? s / counts[d] / overall : 1));
}

export function methodFor(historyDays: number): ForecastMethod {
  if (historyDays < MIN_HISTORY_DAYS) return "insufficient";
  if (historyDays < SEASONAL_MIN_DAYS) return "moving_average";
  if (historyDays < HOLT_WINTERS_MIN_DAYS) return "seasonal_trend";
  return "holt_winters";
}

function predictSeasonalTrend(
  values: number[],
  weekdays: number[],
  futureWeekdays: number[],
): number[] {
  const windowSize = Math.min(values.length, 56);
  const v = values.slice(-windowSize);
  const w = weekdays.slice(-windowSize);
  const idx = weekdayIndices(v, w);
  const deseasonalized = v.map((x, i) => (idx[w[i]] > 0 ? x / idx[w[i]] : x));
  const { slope, intercept } = linearRegression(deseasonalized);
  return futureWeekdays.map((wd, h) => {
    // La pendiente se amortigua para no extrapolar una racha indefinidamente.
    const damp = (1 - 0.92 ** (h + 1)) / (1 - 0.92);
    const level = intercept + slope * (windowSize - 1) + slope * damp;
    return Math.max(0, level * idx[wd]);
  });
}

interface HoltWintersFit {
  level: number;
  trend: number;
  seasonals: number[];
  sse: number;
}

function fitHoltWinters(
  values: number[],
  alpha: number,
  beta: number,
  gamma: number,
): HoltWintersFit {
  const first = values.slice(0, PERIOD);
  const second = values.slice(PERIOD, 2 * PERIOD);
  let level = mean(first);
  let trend = (mean(second) - mean(first)) / PERIOD;
  const seasonals = first.map((x) => x - level);
  let sse = 0;
  for (let t = PERIOD; t < values.length; t++) {
    const s = seasonals[t % PERIOD];
    const predicted = level + trend + s;
    const error = values[t] - predicted;
    sse += error * error;
    const previousLevel = level;
    level = alpha * (values[t] - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
    seasonals[t % PERIOD] = gamma * (values[t] - level) + (1 - gamma) * s;
  }
  return { level, trend, seasonals, sse };
}

const ALPHAS = [0.1, 0.2, 0.3, 0.5];
const BETAS = [0.01, 0.05, 0.1];
const GAMMAS = [0.05, 0.1, 0.2, 0.3];
const DAMPING = 0.9;

function predictHoltWinters(values: number[], horizon: number): number[] {
  let best: HoltWintersFit | null = null;
  for (const a of ALPHAS) {
    for (const b of BETAS) {
      for (const g of GAMMAS) {
        const fit = fitHoltWinters(values, a, b, g);
        if (best === null || fit.sse < best.sse) best = fit;
      }
    }
  }
  const fit = best as HoltWintersFit;
  const n = values.length;
  const out: number[] = [];
  let dampSum = 0;
  for (let h = 1; h <= horizon; h++) {
    dampSum += DAMPING ** h;
    const s = fit.seasonals[(n + h - 1) % PERIOD];
    out.push(Math.max(0, fit.level + dampSum * fit.trend + s));
  }
  return out;
}

function predict(
  method: ForecastMethod,
  values: number[],
  weekdays: number[],
  futureWeekdays: number[],
): number[] {
  const horizon = futureWeekdays.length;
  switch (method) {
    case "moving_average": {
      const avg = movingAverage(values, 7);
      return new Array<number>(horizon).fill(avg);
    }
    case "seasonal_trend":
      return predictSeasonalTrend(values, weekdays, futureWeekdays);
    case "holt_winters":
      return predictHoltWinters(values, horizon);
    default:
      return [];
  }
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * @param series  Serie diaria completa y ordenada (un punto por día, ceros incluidos).
 * @param horizon Días a predecir.
 */
export function forecastSales(series: DailyPoint[], horizon: number): ForecastResult {
  // La historia útil empieza en el primer día con actividad.
  const firstActive = series.findIndex((p) => p.value > 0);
  const history = firstActive === -1 ? [] : series.slice(firstActive);
  const n = history.length;
  const method = methodFor(n);

  if (method === "insufficient") {
    return {
      method,
      methodLabel: METHOD_LABELS[method],
      sufficient: false,
      message:
        n === 0
          ? "Todavía no hay ventas registradas. La predicción se habilita con 14 días de historia."
          : `Hay ${n} ${n === 1 ? "día" : "días"} de ventas. Se necesitan al menos ${MIN_HISTORY_DAYS} para estimar con un mínimo de rigor.`,
      historyDays: n,
      points: [],
      backtest: [],
      accuracy: null,
      trend: null,
      seasonality: null,
    };
  }

  const values = history.map((p) => p.value);
  const weekdays = history.map((p) => weekdayOf(p.date));
  const lastDate = history[n - 1].date;

  // ── Backtest ──
  const holdout = Math.min(14, Math.floor(n / 4));
  const trainValues = values.slice(0, n - holdout);
  const trainWeekdays = weekdays.slice(0, n - holdout);
  const trainMethod = methodFor(trainValues.length);
  const backtestMethod = trainMethod === "insufficient" ? "moving_average" : trainMethod;
  const backtestPred = predict(
    backtestMethod,
    trainValues,
    trainWeekdays,
    weekdays.slice(n - holdout),
  );
  const actual = values.slice(n - holdout);
  const errors = actual.map((a, i) => a - backtestPred[i]);
  const mae = mean(errors.map(Math.abs));
  const pctErrors = actual
    .map((a, i) => (a > 0 ? Math.abs(errors[i]) / a : null))
    .filter((x): x is number => x !== null);
  const mape = pctErrors.length >= Math.ceil(holdout / 2) ? mean(pctErrors) * 100 : null;
  const rmse = Math.sqrt(mean(errors.map((e) => e * e)));

  // ── Predicción ──
  const futureDates = Array.from({ length: horizon }, (_, i) => addDays(lastDate, i + 1));
  const predicted = predict(method, values, weekdays, futureDates.map(weekdayOf));
  const points: ForecastPoint[] = predicted.map((value, i) => {
    // La incertidumbre crece con el horizonte.
    const spread = Z80 * rmse * Math.sqrt(1 + i / 14);
    return {
      date: futureDates[i],
      value: round2(value),
      lower: round2(Math.max(0, value - spread)),
      upper: round2(value + spread),
    };
  });

  // ── Tendencia: últimas 2 semanas contra las 2 anteriores ──
  let trend: ForecastResult["trend"] = null;
  if (n >= 28) {
    const recent = mean(values.slice(-14));
    const previous = mean(values.slice(-28, -14));
    const weeklyChangePct = previous > 0 ? ((recent / previous - 1) / 2) * 100 : 0;
    trend = {
      direction: weeklyChangePct > 1.5 ? "up" : weeklyChangePct < -1.5 ? "down" : "flat",
      weeklyChangePct: round2(weeklyChangePct),
    };
  }

  const seasonality =
    n >= SEASONAL_MIN_DAYS
      ? weekdayIndices(values.slice(-56), weekdays.slice(-56)).map((index, weekday) => ({
          weekday,
          index: round2(index),
        }))
      : null;

  return {
    method,
    methodLabel: METHOD_LABELS[method],
    sufficient: true,
    message:
      method === "moving_average"
        ? "Con menos de 4 semanas de historia la estimación es un promedio simple: todavía no se puede medir tendencia ni estacionalidad."
        : null,
    historyDays: n,
    points,
    backtest: actual.map((_, i) => ({
      date: history[n - holdout + i].date,
      value: round2(backtestPred[i]),
    })),
    accuracy: { mae: round2(mae), mape: mape === null ? null : round2(mape), holdoutDays: holdout },
    trend,
    seasonality,
  };
}

export function sumForecast(points: ForecastPoint[], days: number) {
  const slice = points.slice(0, days);
  // Los errores diarios se suponen independientes: la banda del total
  // crece con la raíz de la suma de varianzas, no linealmente.
  const total = slice.reduce((a, p) => a + p.value, 0);
  const variance = slice.reduce((a, p) => a + ((p.upper - p.value) / Z80) ** 2, 0);
  const spread = Z80 * Math.sqrt(variance);
  return {
    total: round2(total),
    lower: round2(Math.max(0, total - spread)),
    upper: round2(total + spread),
  };
}

// ── Lectura por producto ─────────────────────────────────────────

export interface ProductDemand {
  id: string;
  name: string;
  sku: string;
  stock: number;
  unitsWindow: number;
  unitsPrevWindow: number;
}

export interface StockNeed {
  id: string;
  name: string;
  sku: string;
  stock: number;
  dailyRate: number;
  expectedUnits: number;
  suggestedOrder: number;
  coverageDays: number | null;
}

/** Unidades esperadas en `horizon` días según el ritmo de los últimos `windowDays`. */
export function estimateStockNeeds(
  products: ProductDemand[],
  windowDays: number,
  horizon: number,
): StockNeed[] {
  return products
    .filter((p) => p.unitsWindow > 0)
    .map((p) => {
      const dailyRate = p.unitsWindow / windowDays;
      const expectedUnits = Math.ceil(dailyRate * horizon);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        dailyRate: round2(dailyRate),
        expectedUnits,
        suggestedOrder: Math.max(0, expectedUnits - p.stock),
        coverageDays: dailyRate > 0 ? Math.floor(p.stock / dailyRate) : null,
      };
    })
    .filter((p) => p.suggestedOrder > 0)
    .sort((a, b) => (a.coverageDays ?? 0) - (b.coverageDays ?? 0));
}

export interface ProductMomentum {
  id: string;
  name: string;
  sku: string;
  unitsWindow: number;
  unitsPrevWindow: number;
  changePct: number;
}

/** Productos cuyas unidades crecieron ≥ 20 % entre ventanas, con volumen mínimo. */
export function growthCandidates(products: ProductDemand[], minUnits = 10): ProductMomentum[] {
  return products
    .filter((p) => p.unitsPrevWindow >= minUnits && p.unitsWindow >= minUnits)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unitsWindow: p.unitsWindow,
      unitsPrevWindow: p.unitsPrevWindow,
      changePct: round2((p.unitsWindow / p.unitsPrevWindow - 1) * 100),
    }))
    .filter((p) => p.changePct >= 20)
    .sort((a, b) => b.changePct - a.changePct);
}

/** Productos con stock que rotan menos de una vez por semana. */
export function lowRotation(products: ProductDemand[], windowDays: number): ProductDemand[] {
  const threshold = windowDays / 7;
  return products
    .filter((p) => p.stock > 0 && p.unitsWindow < threshold)
    .sort((a, b) => a.unitsWindow - b.unitsWindow);
}
