// Pure rules of the admin analytics page: which range an address asks for and
// whether the backend would accept it, the links between ranges, how a figure is
// compared with the previous period, and how numbers are written.
// Dates are calendar days ("YYYY-MM-DD") in the store's time zone; they are
// only added and compared as day numbers, never converted through a time zone.

import type { ApiQuery } from "@/lib/api";
import { formatCalendarDay } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { AnalyticsOverview, AnalyticsSection } from "@/types/analytics";

export const ANALYTICS_PATH = "/admin/analytics";
// Fixed on purpose: a day always starts and ends in Vietnam. The backend wants
// an IANA name, never an offset such as +07:00.
export const ANALYTICS_TIMEZONE = "Asia/Ho_Chi_Minh";
export const ANALYTICS_TIMEZONE_NOTE = "UTC+7";
// The backend's limits.
export const MAX_RANGE_DAYS = 366;
export const DEFAULT_RANGE_DAYS = 30;
export const TOP_LIMIT = 10;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export const PRESET_DAYS = [7, 30, 90] as const;
export type PresetDays = (typeof PRESET_DAYS)[number];

export const ANALYTICS_SECTIONS: readonly AnalyticsSection[] = [
  "overview",
  "revenue-by-day",
  "orders-by-status",
  "top-products",
];

export function isAnalyticsSection(value: string): value is AnalyticsSection {
  return (ANALYTICS_SECTIONS as readonly string[]).includes(value);
}

// ---- calendar days ---------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// A calendar day as a number of days since 1970-01-01, or null when the text is
// not a real date the backend accepts (form YYYY-MM-DD, years 2000 to 2100).
export function dayNumber(day: string): number | null {
  const match = DAY_PATTERN.exec(day);
  if (!match) return null;
  const [year, month, date] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  const milliseconds = Date.UTC(year, month - 1, date);
  const check = new Date(milliseconds);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== date
  ) {
    return null;
  }
  return milliseconds / DAY_MS;
}

export function dayFromNumber(value: number): string {
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

// The day `delta` days after (or before, when negative) `day`.
export function addDays(day: string, delta: number): string {
  const value = dayNumber(day);
  return value === null ? day : dayFromNumber(value + delta);
}

// ---- the range -------------------------------------------------------------

export interface DateRange {
  from: string;
  to: string;
  // Both ends counted.
  days: number;
}

export type RangeCheck =
  | { ok: true; range: DateRange }
  | { ok: false; message: string };

// What the backend would accept, checked before anything is sent: both ends are
// real dates, from is not after to, at most 366 days, and the end is not in the
// future (the backend allows that, but a future day can only be empty).
export function validateRange(
  from: string,
  to: string,
  today: string,
): RangeCheck {
  if (from.trim() === "") {
    return { ok: false, message: "Enter a start date." };
  }
  if (to.trim() === "") {
    return { ok: false, message: "Enter an end date." };
  }
  const fromDay = dayNumber(from);
  if (fromDay === null) {
    return { ok: false, message: "The start date is not a valid date." };
  }
  const toDay = dayNumber(to);
  if (toDay === null) {
    return { ok: false, message: "The end date is not a valid date." };
  }
  if (fromDay > toDay) {
    return {
      ok: false,
      message: "The start date must be on or before the end date.",
    };
  }
  const days = toDay - fromDay + 1;
  if (days > MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: `That range is ${days} days. The longest range is ${MAX_RANGE_DAYS} days.`,
    };
  }
  const todayDay = dayNumber(today);
  if (todayDay !== null && toDay > todayDay) {
    return {
      ok: false,
      message: `The end date cannot be after today (${formatCalendarDay(today)}).`,
    };
  }
  return { ok: true, range: { from, to, days } };
}

// The last `days` days, ending today.
export function lastDays(days: number, today: string): DateRange {
  return { from: addDays(today, -(days - 1)), to: today, days };
}

export function defaultRange(today: string): DateRange {
  return lastDays(DEFAULT_RANGE_DAYS, today);
}

// Which preset the range is, if it is exactly "the last N days" ending today.
export function activePreset(range: DateRange, today: string): PresetDays | null {
  if (range.to !== today) return null;
  return PRESET_DAYS.find((days) => days === range.days) ?? null;
}

export interface ParsedRange {
  range: DateRange;
  // Why the address was not used, or null. When it is set the range is the
  // default one and nothing invalid is ever sent to the backend.
  problem: string | null;
}

// Reads `?from=` and `?to=` from an address. With only one of them the other
// end follows the backend's own rule: no `to` is today, no `from` is 29 days
// before `to`. A bad value, a repeated parameter or a range the backend would
// refuse gives the default range and says why.
export function parseRangeParams(
  params: {
    from?: string | string[] | undefined;
    to?: string | string[] | undefined;
  },
  today: string,
): ParsedRange {
  const fallback = defaultRange(today);
  if (Array.isArray(params.from) || Array.isArray(params.to)) {
    return {
      range: fallback,
      problem: "The address repeats the start or end date.",
    };
  }
  if (params.from === undefined && params.to === undefined) {
    return { range: fallback, problem: null };
  }

  let to = params.to;
  let from = params.from;
  if (to === undefined) to = today;
  if (from === undefined) {
    const toDay = dayNumber(to);
    if (toDay === null) {
      return {
        range: fallback,
        problem: to.trim() === "" ? "Enter an end date." : "The end date is not a valid date.",
      };
    }
    from = dayFromNumber(toDay - (DEFAULT_RANGE_DAYS - 1));
  }

  const check = validateRange(from, to, today);
  return check.ok
    ? { range: check.range, problem: null }
    : { range: fallback, problem: check.message };
}

// The address of a range: always both ends, so a shared link shows the same days.
export function analyticsHref(range: { from: string; to: string }): string {
  return `${ANALYTICS_PATH}?from=${range.from}&to=${range.to}`;
}

// The query every analytics request carries. `limit` is only for the ranking.
export function analyticsQuery(
  section: AnalyticsSection,
  range: { from: string; to: string },
): ApiQuery {
  const query: ApiQuery = {
    from: range.from,
    to: range.to,
    timezone: ANALYTICS_TIMEZONE,
  };
  if (section === "top-products") query.limit = TOP_LIMIT;
  return query;
}

// "19 Oct 2026 to 17 Nov 2026" (one date when the range is one day).
export function describeRange(range: { from: string; to: string }): string {
  return range.from === range.to
    ? formatCalendarDay(range.from)
    : `${formatCalendarDay(range.from)} to ${formatCalendarDay(range.to)}`;
}

export function describeDays(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

// ---- comparing with the previous period -------------------------------------

export type ChangeDirection = "up" | "down" | "flat" | "new";

export interface Change {
  direction: ChangeDirection;
  // Always words, so the change never depends on an arrow or a colour:
  // "Up 12.3%", "Down 2.0 percentage points", "No change", "New".
  text: string;
}

const percentNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// 1 decimal, rounded half away from zero on the absolute value.
function oneDecimal(value: number): number {
  return Math.round(Math.abs(value) * 10) / 10;
}

// Money and counts: the change in percent. A previous value of 0 has no
// percentage: 0 to 0 is "No change", 0 to something is "New".
export function percentChange(current: number, previous: number): Change {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { direction: "flat", text: "Not available" };
  }
  if (previous === 0) {
    return current === 0
      ? { direction: "flat", text: "No change" }
      : { direction: "new", text: "New, none in the previous period" };
  }
  const rounded = oneDecimal(((current - previous) / previous) * 100);
  if (rounded === 0) return { direction: "flat", text: "No change" };
  return current > previous
    ? { direction: "up", text: `Up ${percentNumber.format(rounded)}%` }
    : { direction: "down", text: `Down ${percentNumber.format(rounded)}%` };
}

// Rates (0 to 1): the change in percentage points, never a percent of a percent.
export function pointChange(current: number, previous: number): Change {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { direction: "flat", text: "Not available" };
  }
  const rounded = oneDecimal((current - previous) * 100);
  if (rounded === 0) return { direction: "flat", text: "No change" };
  return current > previous
    ? {
        direction: "up",
        text: `Up ${percentNumber.format(rounded)} percentage points`,
      }
    : {
        direction: "down",
        text: `Down ${percentNumber.format(rounded)} percentage points`,
      };
}

export interface Kpi {
  key: string;
  label: string;
  value: string;
  // The same figure for the previous period, as text.
  previous: string;
  change: Change;
  // A rise is bad news (cancellations), so its colours are swapped.
  lowerIsBetter: boolean;
}

// The five figures of the page, exactly as the overview API gives them (nothing
// is recomputed here) with the change against the previous period.
export function kpisOf(overview: AnalyticsOverview): Kpi[] {
  const { current, previous } = overview;
  return [
    {
      key: "revenue",
      label: "Revenue",
      value: formatVnd(current.revenue),
      previous: formatVnd(previous.revenue),
      change: percentChange(current.revenue, previous.revenue),
      lowerIsBetter: false,
    },
    {
      key: "paid-orders",
      label: "Paid orders",
      value: formatCount(current.orderCount),
      previous: formatCount(previous.orderCount),
      change: percentChange(current.orderCount, previous.orderCount),
      lowerIsBetter: false,
    },
    {
      key: "average-order-value",
      label: "Average order value",
      value: formatVnd(current.averageOrderValue),
      previous: formatVnd(previous.averageOrderValue),
      change: percentChange(
        current.averageOrderValue,
        previous.averageOrderValue,
      ),
      lowerIsBetter: false,
    },
    {
      key: "cancelled-rate",
      label: "Cancelled rate",
      value: formatRate(current.cancelledRate),
      previous: formatRate(previous.cancelledRate),
      change: pointChange(current.cancelledRate, previous.cancelledRate),
      lowerIsBetter: true,
    },
    {
      key: "new-customers",
      label: "New customers",
      value: formatCount(current.newCustomers),
      previous: formatCount(previous.newCustomers),
      change: percentChange(current.newCustomers, previous.newCustomers),
      lowerIsBetter: false,
    },
  ];
}

// ---- writing numbers -------------------------------------------------------

const countFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

// 1234 -> "1,234": a count, written the same on the server and in the browser.
export function formatCount(value: number): string {
  return countFormatter.format(Number.isFinite(value) ? value : 0);
}

// 0.0897 -> "9.0%"
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "0.0%";
  return `${(rate * 100).toFixed(1)}%`;
}

// A share of a total as "42.5%"; 0 when the total is 0 (never NaN).
export function formatShare(part: number, total: number): string {
  return `${(shareOf(part, total) * 100).toFixed(1)}%`;
}

// 0 to 1; 0 when the total is 0.
export function shareOf(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(1, Math.max(0, part / total));
}

const COMPACT_UNITS = [
  { value: 1_000, suffix: "K" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000_000_000, suffix: "B" },
] as const;

// A short amount for a chart axis: 0, 500, 300K, 1.5M, 12M, 2.1B. The full
// figure always comes from formatVnd; this is only for the axis.
export function formatCompactVnd(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  let index = -1;
  COMPACT_UNITS.forEach((unit, position) => {
    if (absolute >= unit.value) index = position;
  });
  if (index === -1) return `${sign}${Math.round(absolute)}`;
  // 999,950 would round to "1000K": say "1M" instead.
  if (
    Math.round(absolute / COMPACT_UNITS[index].value) >= 1000 &&
    index < COMPACT_UNITS.length - 1
  ) {
    index += 1;
  }
  const scaled = absolute / COMPACT_UNITS[index].value;
  const text =
    scaled < 10
      ? String(Math.round(scaled * 10) / 10)
      : String(Math.round(scaled));
  return `${sign}${text}${COMPACT_UNITS[index].suffix}`;
}
