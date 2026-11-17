// Pure scaling for the revenue chart: a round top for the axis, where each bar
// goes, which day labels fit, and which day a pointer is over. The component
// only draws what these return.

import type { RevenueDay } from "@/types/analytics";

export interface AxisScale {
  // The top of the axis: a multiple of `step`, at least the largest value.
  top: number;
  step: number;
  // 0, step, 2 x step ... top.
  ticks: number[];
}

const NICE_FACTORS = [1, 2, 2.5, 5, 10] as const;

// A round step (1, 2, 2.5 or 5 times a power of ten) that reaches `max` in about
// `targetTicks` steps, so the axis reads 0, 5M, 10M, 15M and not 0, 3.75M, ...
export function niceScale(max: number, targetTicks = 4): AxisScale {
  if (!Number.isFinite(max) || max <= 0) {
    return { top: 1, step: 1, ticks: [0, 1] };
  }
  const rough = max / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    (NICE_FACTORS.find((factor) => factor * magnitude >= rough) ?? 10) *
    magnitude;
  const count = Math.ceil(max / step - 1e-9);
  const ticks = Array.from({ length: count + 1 }, (_, index) => index * step);
  return { top: count * step, step, ticks };
}

export interface PlotBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  // A day without revenue is drawn as a thin stub so the day is still there.
  empty: boolean;
}

export const EMPTY_BAR_HEIGHT = 2;

// One bar per value, the bars evenly spread over the plot with a gap between.
export function barLayout(
  values: readonly number[],
  box: PlotBox,
  axisTop: number,
): Bar[] {
  const count = values.length;
  if (count === 0 || box.width <= 0 || box.height <= 0 || axisTop <= 0) {
    return [];
  }
  const slot = box.width / count;
  // Thin slots (a year of days on a phone) keep a smaller gap.
  const gapShare = slot >= 8 ? 0.3 : slot >= 3 ? 0.2 : 0.1;
  const width = Math.max(1, slot * (1 - gapShare));
  return values.map((value, index) => {
    const empty = !(value > 0);
    const height = empty
      ? EMPTY_BAR_HEIGHT
      : Math.max(EMPTY_BAR_HEIGHT, (Math.min(value, axisTop) / axisTop) * box.height);
    return {
      x: box.left + index * slot + (slot - width) / 2,
      y: box.top + box.height - height,
      width,
      height,
      empty,
    };
  });
}

// Which day labels to print: evenly spaced, the first always included, no more
// than `maxLabels`. Returns indexes into the days.
export function labelIndexes(count: number, maxLabels: number): number[] {
  if (count <= 0) return [];
  const limit = Math.max(1, Math.floor(maxLabels));
  const step = Math.max(1, Math.ceil(count / limit));
  const indexes: number[] = [];
  for (let index = 0; index < count; index += step) indexes.push(index);
  return indexes;
}

// How many day labels fit in a width (a label such as "17 Nov" needs room).
export function maxLabelsFor(width: number, labelWidth = 64): number {
  return Math.max(2, Math.floor(width / labelWidth));
}

// The day under a pointer, or null for a chart with no days. A pointer outside
// the plot snaps to the nearest end.
export function indexAtX(
  x: number,
  box: Pick<PlotBox, "left" | "width">,
  count: number,
): number | null {
  if (count <= 0 || box.width <= 0) return null;
  const ratio = (x - box.left) / box.width;
  return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
}

// The next day for an arrow key, clamped to the first and last day.
export function stepIndex(
  current: number | null,
  key: "ArrowLeft" | "ArrowRight" | "Home" | "End",
  count: number,
): number | null {
  if (count <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (current === null) return key === "ArrowRight" ? 0 : count - 1;
  const next = key === "ArrowRight" ? current + 1 : current - 1;
  return Math.min(count - 1, Math.max(0, next));
}

export interface DaySummary {
  total: number;
  paidOrders: number;
  // The day with the most revenue (the earliest one when tied), or null when no
  // day has revenue.
  best: RevenueDay | null;
  hasOrders: boolean;
}

export function summarizeDays(days: readonly RevenueDay[]): DaySummary {
  let total = 0;
  let paidOrders = 0;
  let best: RevenueDay | null = null;
  for (const day of days) {
    total += day.revenue;
    paidOrders += day.orders;
    if (day.revenue > 0 && (best === null || day.revenue > best.revenue)) {
      best = day;
    }
  }
  return { total, paidOrders, best, hasOrders: paidOrders > 0 };
}
