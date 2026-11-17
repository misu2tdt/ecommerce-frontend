import { expect, test } from "@playwright/test";
import {
  ANALYTICS_TIMEZONE,
  MAX_RANGE_DAYS,
  activePreset,
  addDays,
  analyticsHref,
  analyticsQuery,
  dayNumber,
  defaultRange,
  describeRange,
  formatCompactVnd,
  formatCount,
  formatRate,
  formatShare,
  isAnalyticsSection,
  kpisOf,
  lastDays,
  parseRangeParams,
  percentChange,
  pointChange,
  shareOf,
  validateRange,
} from "@/lib/analytics";
import {
  barLayout,
  indexAtX,
  labelIndexes,
  maxLabelsFor,
  niceScale,
  stepIndex,
  summarizeDays,
} from "@/lib/analytics-chart";
import {
  formatCalendarDay,
  formatCalendarDayLong,
  formatCalendarDayShort,
  todayInVietnam,
} from "@/lib/dates";
import type { AnalyticsOverview } from "@/types/analytics";

const TODAY = "2026-11-17";

test.describe("calendar days", () => {
  test("accepts real dates only, in the backend's year range", () => {
    expect(dayNumber("2026-11-17")).not.toBeNull();
    expect(dayNumber("2024-02-29")).not.toBeNull();
    for (const bad of [
      "2026-02-30",
      "2026-13-01",
      "2026-00-10",
      "2026-1-1",
      "20261117",
      "2026-11-17T00:00:00Z",
      " 2026-11-17",
      "",
      "1999-12-31",
      "2101-01-01",
    ]) {
      expect(dayNumber(bad), bad).toBeNull();
    }
  });

  test("adds and subtracts days across months and years", () => {
    expect(addDays("2026-11-17", -29)).toBe("2026-10-19");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

test.describe("validateRange", () => {
  test("accepts a range of one day, 30 days and the longest allowed", () => {
    expect(validateRange("2026-11-17", "2026-11-17", TODAY)).toEqual({
      ok: true,
      range: { from: "2026-11-17", to: "2026-11-17", days: 1 },
    });
    expect(validateRange("2026-10-19", "2026-11-17", TODAY)).toEqual({
      ok: true,
      range: { from: "2026-10-19", to: "2026-11-17", days: 30 },
    });
    // 2025-11-17 to 2026-11-17 is 366 days with both ends counted.
    const longest = validateRange("2025-11-17", "2026-11-17", TODAY);
    expect(longest.ok && longest.range.days).toBe(MAX_RANGE_DAYS);
  });

  test("refuses one day more than 366", () => {
    const check = validateRange("2025-11-16", "2026-11-17", TODAY);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.message).toContain("367 days");
  });

  test("refuses a start after the end", () => {
    const check = validateRange("2026-11-10", "2026-11-09", TODAY);
    expect(check).toEqual({
      ok: false,
      message: "The start date must be on or before the end date.",
    });
  });

  test("refuses an end after today, and says which day today is", () => {
    const check = validateRange("2026-11-10", "2026-11-18", TODAY);
    expect(check).toEqual({
      ok: false,
      message: "The end date cannot be after today (17 Nov 2026).",
    });
    // Today itself is fine.
    expect(validateRange("2026-11-10", TODAY, TODAY).ok).toBe(true);
  });

  test("names the field that is empty or not a date", () => {
    expect(validateRange("", "2026-11-10", TODAY)).toEqual({
      ok: false,
      message: "Enter a start date.",
    });
    expect(validateRange("2026-11-10", "", TODAY)).toEqual({
      ok: false,
      message: "Enter an end date.",
    });
    expect(validateRange("2026-02-30", "2026-03-05", TODAY)).toEqual({
      ok: false,
      message: "The start date is not a valid date.",
    });
    expect(validateRange("2026-03-01", "nope", TODAY)).toEqual({
      ok: false,
      message: "The end date is not a valid date.",
    });
  });
});

test.describe("presets and the default range", () => {
  test("the last N days end today and count both ends", () => {
    expect(lastDays(7, TODAY)).toEqual({
      from: "2026-11-11",
      to: TODAY,
      days: 7,
    });
    expect(lastDays(30, TODAY)).toEqual({
      from: "2026-10-19",
      to: TODAY,
      days: 30,
    });
    expect(lastDays(90, TODAY).from).toBe("2026-08-20");
    expect(defaultRange(TODAY)).toEqual(lastDays(30, TODAY));
  });

  test("a range is a preset only when it ends today and has that length", () => {
    expect(activePreset(lastDays(7, TODAY), TODAY)).toBe(7);
    expect(activePreset(lastDays(30, TODAY), TODAY)).toBe(30);
    expect(activePreset(lastDays(90, TODAY), TODAY)).toBe(90);
    expect(activePreset(lastDays(14, TODAY), TODAY)).toBeNull();
    expect(
      activePreset({ from: "2026-10-01", to: "2026-10-30", days: 30 }, TODAY),
    ).toBeNull();
  });
});

test.describe("reading the address", () => {
  test("no parameters is the last 30 days, with nothing to report", () => {
    expect(parseRangeParams({}, TODAY)).toEqual({
      range: defaultRange(TODAY),
      problem: null,
    });
  });

  test("uses a valid from and to", () => {
    expect(
      parseRangeParams({ from: "2026-11-01", to: "2026-11-10" }, TODAY),
    ).toEqual({
      range: { from: "2026-11-01", to: "2026-11-10", days: 10 },
      problem: null,
    });
  });

  test("with only from the range runs to today; with only to it starts 29 days before", () => {
    expect(parseRangeParams({ from: "2026-11-10" }, TODAY).range).toEqual({
      from: "2026-11-10",
      to: TODAY,
      days: 8,
    });
    expect(parseRangeParams({ to: "2026-11-10" }, TODAY).range).toEqual({
      from: "2026-10-12",
      to: "2026-11-10",
      days: 30,
    });
  });

  test("anything the backend would refuse gives the default range and a reason", () => {
    const cases: Array<[Record<string, string | string[]>, string]> = [
      [{ from: "2026-11-10", to: "2026-11-09" }, "start date must be on or before"],
      [{ from: "2026-02-30", to: "2026-03-01" }, "start date is not a valid date"],
      [{ from: "2026-11-01", to: "2026-11-30" }, "cannot be after today"],
      [{ from: "2020-01-01", to: "2026-11-01" }, "longest range is 366 days"],
      [{ from: "", to: "" }, "Enter a start date"],
      [{ to: "garbage" }, "end date is not a valid date"],
      [{ from: ["2026-11-01", "2026-11-02"], to: "2026-11-10" }, "repeats"],
      [{ from: "+07:00", to: "2026-11-10" }, "not a valid date"],
    ];
    for (const [params, reason] of cases) {
      const parsed = parseRangeParams(params, TODAY);
      expect(parsed.range, JSON.stringify(params)).toEqual(defaultRange(TODAY));
      expect(parsed.problem, JSON.stringify(params)).toContain(reason);
    }
  });
});

test.describe("addresses and queries", () => {
  test("a range address always has both ends", () => {
    expect(analyticsHref({ from: "2026-11-11", to: "2026-11-17" })).toBe(
      "/admin/analytics?from=2026-11-11&to=2026-11-17",
    );
  });

  test("every request carries the range and an IANA time zone, never an offset", () => {
    expect(ANALYTICS_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
    expect(ANALYTICS_TIMEZONE).not.toMatch(/^[+-]\d/);
    expect(
      analyticsQuery("overview", { from: "2026-11-01", to: "2026-11-10" }),
    ).toEqual({
      from: "2026-11-01",
      to: "2026-11-10",
      timezone: "Asia/Ho_Chi_Minh",
    });
  });

  test("only the ranking asks for a limit, and 10 is within the backend's 1 to 50", () => {
    const query = analyticsQuery("top-products", {
      from: "2026-11-01",
      to: "2026-11-10",
    });
    expect(query.limit).toBe(10);
    expect(
      analyticsQuery("revenue-by-day", { from: "2026-11-01", to: "2026-11-10" }),
    ).not.toHaveProperty("limit");
  });

  test("knows the four sections and nothing else", () => {
    for (const name of [
      "overview",
      "revenue-by-day",
      "orders-by-status",
      "top-products",
    ]) {
      expect(isAnalyticsSection(name)).toBe(true);
    }
    for (const name of ["", "users", "../overview", "Overview"]) {
      expect(isAnalyticsSection(name)).toBe(false);
    }
  });

  test("describes a range in words", () => {
    expect(describeRange({ from: "2026-10-19", to: "2026-11-17" })).toBe(
      "19 Oct 2026 to 17 Nov 2026",
    );
    expect(describeRange({ from: "2026-11-17", to: "2026-11-17" })).toBe(
      "17 Nov 2026",
    );
  });
});

test.describe("change against the previous period", () => {
  test("a percent change, to one decimal, in words", () => {
    expect(percentChange(112, 100)).toEqual({ direction: "up", text: "Up 12.0%" });
    expect(percentChange(90, 100)).toEqual({ direction: "down", text: "Down 10.0%" });
    expect(percentChange(133_397_200, 109_239_500)).toEqual({
      direction: "up",
      text: "Up 22.1%",
    });
    expect(percentChange(30, 100).text).toBe("Down 70.0%");
  });

  test("a large change is written with a thousands separator", () => {
    expect(percentChange(13_346, 100).text).toBe("Up 13,246.0%");
  });

  test("a change that rounds to nothing is flat", () => {
    expect(percentChange(100_001, 100_000)).toEqual({
      direction: "flat",
      text: "No change",
    });
    expect(percentChange(5, 5).direction).toBe("flat");
  });

  test("a previous value of zero never gives NaN or Infinity", () => {
    expect(percentChange(0, 0)).toEqual({ direction: "flat", text: "No change" });
    const fromNothing = percentChange(250, 0);
    expect(fromNothing.direction).toBe("new");
    expect(fromNothing.text).not.toMatch(/NaN|Infinity/);
    expect(percentChange(0, 250)).toEqual({ direction: "down", text: "Down 100.0%" });
  });

  test("a value that is not a number is reported, not printed", () => {
    for (const change of [
      percentChange(Number.NaN, 5),
      percentChange(5, Number.POSITIVE_INFINITY),
      pointChange(Number.NaN, 0.1),
    ]) {
      expect(change).toEqual({ direction: "flat", text: "Not available" });
    }
  });

  test("a rate changes in percentage points, not in percent", () => {
    expect(pointChange(0.0912, 0.0522)).toEqual({
      direction: "up",
      text: "Up 3.9 percentage points",
    });
    expect(pointChange(0.05, 0.1)).toEqual({
      direction: "down",
      text: "Down 5.0 percentage points",
    });
    expect(pointChange(0.1, 0.1)).toEqual({ direction: "flat", text: "No change" });
    // From 0 there is no percent, but there is a number of points.
    expect(pointChange(0.0714, 0)).toEqual({
      direction: "up",
      text: "Up 7.1 percentage points",
    });
    expect(pointChange(0, 0).direction).toBe("flat");
  });
});

test.describe("writing numbers", () => {
  test("a rate and a share, to one decimal", () => {
    expect(formatRate(0.0897)).toBe("9.0%");
    expect(formatRate(0)).toBe("0.0%");
    expect(formatRate(1)).toBe("100.0%");
    expect(formatRate(Number.NaN)).toBe("0.0%");
    expect(formatShare(343, 401)).toBe("85.5%");
  });

  test("a share of nothing is 0, never NaN", () => {
    expect(shareOf(0, 0)).toBe(0);
    expect(shareOf(5, 0)).toBe(0);
    expect(formatShare(0, 0)).toBe("0.0%");
    expect(shareOf(5, 4)).toBe(1);
  });

  test("a count has thousands separators", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(1234)).toBe("1,234");
    expect(formatCount(Number.NaN)).toBe("0");
  });

  test("an axis amount is short: K, M, B", () => {
    expect(formatCompactVnd(0)).toBe("0");
    expect(formatCompactVnd(500)).toBe("500");
    expect(formatCompactVnd(1_000)).toBe("1K");
    expect(formatCompactVnd(300_000)).toBe("300K");
    expect(formatCompactVnd(1_500_000)).toBe("1.5M");
    expect(formatCompactVnd(12_000_000)).toBe("12M");
    expect(formatCompactVnd(2_100_000_000)).toBe("2.1B");
    expect(formatCompactVnd(25_000)).toBe("25K");
  });

  test("an amount that would round to 1000K says 1M", () => {
    expect(formatCompactVnd(999_950)).toBe("1M");
    expect(formatCompactVnd(999_499)).toBe("999K");
  });
});

test.describe("calendar day text from the backend", () => {
  test("is read, not converted through a time zone", () => {
    expect(formatCalendarDay("2026-11-17")).toBe("17 Nov 2026");
    expect(formatCalendarDayShort("2026-11-07")).toBe("7 Nov");
    expect(formatCalendarDayLong("2026-11-17")).toBe("Tue 17 Nov 2026");
    expect(formatCalendarDayLong("2026-11-14")).toBe("Sat 14 Nov 2026");
    expect(formatCalendarDay("2026-02-30")).toBe("Date unavailable");
    expect(formatCalendarDay("nope")).toBe("Date unavailable");
  });

  test("today in Vietnam rolls over at 17:00 UTC", () => {
    expect(todayInVietnam(new Date("2026-11-17T16:59:59Z"))).toBe("2026-11-17");
    expect(todayInVietnam(new Date("2026-11-17T17:00:00Z"))).toBe("2026-11-18");
    expect(todayInVietnam(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
});

function overviewOf(
  current: Partial<AnalyticsOverview["current"]>,
  previous: Partial<AnalyticsOverview["previous"]>,
): AnalyticsOverview {
  const empty = {
    revenue: 0,
    orderCount: 0,
    averageOrderValue: 0,
    placedOrders: 0,
    cancelledOrders: 0,
    cancelledRate: 0,
    newCustomers: 0,
  };
  return {
    currency: "VND",
    revenueStatuses: ["confirmed", "processing", "shipped", "delivered"],
    range: { from: "2026-10-19", to: "2026-11-17", days: 30, timezone: ANALYTICS_TIMEZONE },
    previousRange: { from: "2026-09-19", to: "2026-10-18", days: 30 },
    current: { ...empty, ...current },
    previous: { ...empty, ...previous },
  };
}

test.describe("the five figures", () => {
  test("come in a fixed order with the API's own numbers", () => {
    const kpis = kpisOf(
      overviewOf(
        {
          revenue: 1_550_000,
          orderCount: 5,
          averageOrderValue: 310_000,
          placedOrders: 7,
          cancelledOrders: 1,
          cancelledRate: 0.1429,
          newCustomers: 2,
        },
        {
          revenue: 250_000,
          orderCount: 3,
          averageOrderValue: 83_333,
          placedOrders: 4,
          cancelledOrders: 1,
          cancelledRate: 0.25,
          newCustomers: 0,
        },
      ),
    );
    expect(kpis.map((kpi) => kpi.label)).toEqual([
      "Revenue",
      "Paid orders",
      "Average order value",
      "Cancelled rate",
      "New customers",
    ]);
    expect(kpis[1].value).toBe("5");
    expect(kpis[3].value).toBe("14.3%");
    expect(kpis[4].value).toBe("2");
    expect(kpis[0].change.text).toBe("Up 520.0%");
    // The rate is compared in points; new customers from zero is "new".
    expect(kpis[3].change.text).toBe("Down 10.7 percentage points");
    expect(kpis[3].lowerIsBetter).toBe(true);
    expect(kpis[4].change.direction).toBe("new");
    expect(kpis.filter((kpi) => kpi.lowerIsBetter)).toHaveLength(1);
  });

  test("an empty period has no NaN and no Infinity anywhere", () => {
    const kpis = kpisOf(overviewOf({}, {}));
    for (const kpi of kpis) {
      expect(`${kpi.value} ${kpi.previous} ${kpi.change.text}`).not.toMatch(
        /NaN|Infinity/,
      );
      expect(kpi.change.direction).toBe("flat");
    }
  });
});

test.describe("axis scale", () => {
  test("rounds the top to a step of 1, 2, 2.5 or 5 times a power of ten", () => {
    expect(niceScale(12_300_000)).toEqual({
      top: 15_000_000,
      step: 5_000_000,
      ticks: [0, 5_000_000, 10_000_000, 15_000_000],
    });
    expect(niceScale(20_000_000).top).toBe(20_000_000);
    expect(niceScale(7_000_000)).toEqual({
      top: 8_000_000,
      step: 2_000_000,
      ticks: [0, 2_000_000, 4_000_000, 6_000_000, 8_000_000],
    });
  });

  test("the top always reaches the largest value, for any size", () => {
    for (const max of [1, 3, 99, 100, 101, 999_999, 1_000_001, 5_600_000, 330_785_450]) {
      const scale = niceScale(max);
      expect(scale.top, `max ${max}`).toBeGreaterThanOrEqual(max);
      expect(scale.ticks[0]).toBe(0);
      expect(scale.ticks.at(-1)).toBe(scale.top);
      expect(scale.ticks.length, `max ${max}`).toBeLessThanOrEqual(7);
    }
  });

  test("nothing to scale gives a usable axis, not NaN", () => {
    for (const max of [0, -5, Number.NaN]) {
      expect(niceScale(max)).toEqual({ top: 1, step: 1, ticks: [0, 1] });
    }
  });
});

test.describe("bar layout", () => {
  const box = { left: 50, top: 10, width: 300, height: 200 };

  test("gives every day a slot inside the plot, in order", () => {
    const bars = barLayout([0, 50, 100], box, 100);
    expect(bars).toHaveLength(3);
    bars.forEach((bar, index) => {
      expect(bar.x).toBeGreaterThanOrEqual(box.left + index * 100);
      expect(bar.x + bar.width).toBeLessThanOrEqual(box.left + (index + 1) * 100 + 0.001);
    });
    // Heights follow the values; the bars stand on the bottom of the plot.
    expect(bars[2].height).toBeCloseTo(200);
    expect(bars[1].height).toBeCloseTo(100);
    for (const bar of bars) expect(bar.y + bar.height).toBeCloseTo(210);
  });

  test("a day without revenue is a thin stub, so the day is still there", () => {
    const [stub] = barLayout([0], box, 100);
    expect(stub.empty).toBe(true);
    expect(stub.height).toBe(2);
  });

  test("a value above the axis is cut at the top and never negative", () => {
    const [bar] = barLayout([500], box, 100);
    expect(bar.height).toBe(200);
    const [negative] = barLayout([-5], box, 100);
    expect(negative.empty).toBe(true);
  });

  test("a year of days still gives every bar a width of at least 1", () => {
    const bars = barLayout(Array.from({ length: 366 }, () => 1), { ...box, width: 330 }, 1);
    expect(bars).toHaveLength(366);
    for (const bar of bars) expect(bar.width).toBeGreaterThanOrEqual(1);
  });

  test("an empty plot or axis gives no bars", () => {
    expect(barLayout([], box, 100)).toEqual([]);
    expect(barLayout([1], { ...box, width: 0 }, 100)).toEqual([]);
    expect(barLayout([1], box, 0)).toEqual([]);
  });
});

test.describe("axis labels and pointer", () => {
  test("prints every label when they fit and an even subset when they do not", () => {
    expect(labelIndexes(5, 8)).toEqual([0, 1, 2, 3, 4]);
    expect(labelIndexes(30, 8)).toEqual([0, 4, 8, 12, 16, 20, 24, 28]);
    expect(labelIndexes(366, 10).length).toBeLessThanOrEqual(10);
    expect(labelIndexes(366, 10)[0]).toBe(0);
    expect(labelIndexes(0, 8)).toEqual([]);
  });

  test("the number of labels follows the width, never below 2", () => {
    expect(maxLabelsFor(640, 64)).toBe(10);
    expect(maxLabelsFor(100, 64)).toBe(2);
    expect(maxLabelsFor(0)).toBe(2);
  });

  test("finds the day under the pointer and snaps to the ends outside the plot", () => {
    const plot = { left: 50, width: 300 };
    expect(indexAtX(50, plot, 3)).toBe(0);
    expect(indexAtX(149, plot, 3)).toBe(0);
    expect(indexAtX(160, plot, 3)).toBe(1);
    expect(indexAtX(349, plot, 3)).toBe(2);
    expect(indexAtX(10, plot, 3)).toBe(0);
    expect(indexAtX(900, plot, 3)).toBe(2);
    expect(indexAtX(10, plot, 0)).toBeNull();
  });

  test("arrow keys move one day and stop at the ends", () => {
    expect(stepIndex(null, "ArrowRight", 30)).toBe(0);
    expect(stepIndex(null, "ArrowLeft", 30)).toBe(29);
    expect(stepIndex(3, "ArrowRight", 30)).toBe(4);
    expect(stepIndex(3, "ArrowLeft", 30)).toBe(2);
    expect(stepIndex(0, "ArrowLeft", 30)).toBe(0);
    expect(stepIndex(29, "ArrowRight", 30)).toBe(29);
    expect(stepIndex(10, "Home", 30)).toBe(0);
    expect(stepIndex(10, "End", 30)).toBe(29);
    expect(stepIndex(null, "End", 0)).toBeNull();
  });
});

test.describe("summary of the days", () => {
  test("totals, paid orders and the best day (the earlier one when tied)", () => {
    const summary = summarizeDays([
      { date: "2026-11-10", revenue: 1_150_000, orders: 3 },
      { date: "2026-11-11", revenue: 100_000, orders: 1 },
      { date: "2026-11-12", revenue: 1_150_000, orders: 2 },
    ]);
    expect(summary.total).toBe(2_400_000);
    expect(summary.paidOrders).toBe(6);
    expect(summary.best?.date).toBe("2026-11-10");
    expect(summary.hasOrders).toBe(true);
  });

  test("days with no orders have no best day", () => {
    const summary = summarizeDays([
      { date: "2026-11-10", revenue: 0, orders: 0 },
      { date: "2026-11-11", revenue: 0, orders: 0 },
    ]);
    expect(summary).toEqual({ total: 0, paidOrders: 0, best: null, hasOrders: false });
    expect(summarizeDays([]).hasOrders).toBe(false);
  });
});
