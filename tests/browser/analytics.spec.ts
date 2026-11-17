import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { BASE_URL, CUSTOMER, signIn } from "./support/shop";
import {
  adminGet,
  cancelOrderQuietly,
  createShopper,
  loginsPerformed,
  signInAsAdmin,
  type TestShopper,
} from "./support/reconciliation";
import {
  TIMEZONE,
  analyticsFromApi,
  longDay,
  mediumDay,
  placeCancelledOrder,
  placePaidOrder,
  sectionsRequested,
  settled,
  shiftDay,
  vietnamToday,
  watchAnalyticsRequests,
  type Figures,
} from "./support/analytics";

// The admin analytics page against the real seeded backend. The test database
// has little history, so the numbers are never worked out by hand: every figure
// the page shows is compared with the backend's own answer for the same range.
// The orders that make the range worth looking at are made through the API (a
// shopper registered for this run). A paid order can not be cancelled, so those
// stay in the test database; the unpaid one is cancelled again.

const PATH = "/admin/analytics";
const ALL_SECTIONS = [
  "orders-by-status",
  "overview",
  "revenue-by-day",
  "top-products",
];

test.describe.configure({ mode: "serial" });

let api: APIRequestContext;
let shopper: TestShopper | undefined;
let todayVn: string;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  api = await playwrightRequest.newContext();
  todayVn = vietnamToday();
  shopper = await createShopper(api, 10);
  await placePaidOrder(api, shopper, 2);
  await placePaidOrder(api, shopper, 1);
  await placeCancelledOrder(api, shopper);
});

test.afterAll(async () => {
  try {
    // Nothing of this spec is left unpaid and holding stock.
    if (api && shopper) {
      const orders = (await (
        await adminGet(api, "/admin/orders?page=1&limit=20")
      ).json()) as Array<{ id: number; userId: number; status: string }>;
      for (const order of orders) {
        if (order.userId === shopper.userId && order.status === "pending") {
          await cancelOrderQuietly(api, shopper, order.id);
        }
      }
    }
  } finally {
    console.log(`analytics spec logins: ${JSON.stringify(loginsPerformed())}`);
    await api?.dispose();
  }
});

async function openAnalytics(page: Page, query = "", width = 1440) {
  await signInAsAdmin(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${PATH}${query}`);
  await settled(page);
}

const region = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

const defaultFrom = () => shiftDay(todayVn, -29);

// ---- what the page should print for a figure ---------------------------------

const vnd = (amount: number) => amount.toLocaleString("vi-VN");
const count = (value: number) => value.toLocaleString("en-US");
const rate = (value: number) => `${(value * 100).toFixed(1)}%`;
const oneDecimal = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function percentWords(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "No change" : "New, none in the previous period";
  }
  const size = Math.round(Math.abs(((current - previous) / previous) * 100) * 10) / 10;
  if (size === 0) return "No change";
  return `${current > previous ? "Up" : "Down"} ${oneDecimal(size)}%`;
}

function pointWords(current: number, previous: number): string {
  const size = Math.round(Math.abs((current - previous) * 100) * 10) / 10;
  if (size === 0) return "No change";
  return `${current > previous ? "Up" : "Down"} ${oneDecimal(size)} percentage points`;
}

async function expectKpis(
  page: Page,
  current: Figures,
  previous: Figures,
): Promise<void> {
  // [label, value, previous value, change in words, is it money]
  const rows: Array<[string, string, string, string, boolean]> = [
    ["Revenue", vnd(current.revenue), vnd(previous.revenue), percentWords(current.revenue, previous.revenue), true],
    ["Paid orders", count(current.orderCount), count(previous.orderCount), percentWords(current.orderCount, previous.orderCount), false],
    [
      "Average order value",
      vnd(current.averageOrderValue),
      vnd(previous.averageOrderValue),
      percentWords(current.averageOrderValue, previous.averageOrderValue),
      true,
    ],
    ["Cancelled rate", rate(current.cancelledRate), rate(previous.cancelledRate), pointWords(current.cancelledRate, previous.cancelledRate), false],
    ["New customers", count(current.newCustomers), count(previous.newCustomers), percentWords(current.newCustomers, previous.newCustomers), false],
  ];
  const figures = region(page, "Key figures");
  await expect(figures.getByRole("article")).toHaveCount(5);
  for (const [label, value, before, change, money] of rows) {
    const card = figures.getByRole("article", { name: label, exact: true });
    // Money has a currency sign around the digits; the rest is the whole text.
    const shown = card.locator("[data-kpi-value]");
    if (money) {
      await expect(shown, `${label} value`).toContainText(value);
      await expect(shown, `${label} value`).toContainText("₫");
    } else {
      await expect(shown, `${label} value`).toHaveText(value);
    }
    await expect(card.locator("[data-kpi-change]"), `${label} change`).toHaveText(change);
    await expect(card.locator("[data-kpi-previous]"), `${label} previous`).toContainText(before);
    // The arrow is a picture next to the words, never the only signal.
    await expect(card.locator('[data-kpi-change] svg[aria-hidden="true"]')).toHaveCount(1);
    await expect(card).not.toContainText(/NaN|Infinity|undefined/);
  }
}

// ---- the page ----------------------------------------------------------------

test.describe("the page", () => {
  test("renders for an admin: heading, time zone, range, four sections, out of search results", async ({
    page,
  }) => {
    await openAnalytics(page);
    await expect(
      page.getByRole("heading", { level: 2, name: "Analytics", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-timezone]")).toHaveText(TIMEZONE);
    await expect(page.locator("[data-range-summary]")).toContainText(
      `${mediumDay(defaultFrom())} to ${mediumDay(todayVn)} (30 days)`,
    );
    for (const name of [
      "Key figures",
      "Revenue by day",
      "Orders by status",
      "Best sellers",
    ]) {
      await expect(region(page, name), name).toBeVisible();
    }
    // The default is the last 30 days and the address stays clean.
    await expect(page).toHaveURL(/\/admin\/analytics$/);
    await expect(
      page.getByRole("navigation", { name: "Range presets" }).getByRole("link", { name: "Last 30 days" }),
    ).toHaveAttribute("aria-current", "true");

    const robots = await page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
    );
    expect(robots).toMatch(/noindex/);
  });

  test("the admin navigation links to it and marks it as the current page", async ({
    page,
  }) => {
    await openAnalytics(page, "", 1440);
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Admin sections" });
    const link = nav.getByRole("link", { name: "Analytics", exact: true });
    await expect(link).toHaveAttribute("href", "/admin/analytics");
    await expect(link).not.toHaveAttribute("aria-current", "page");
    await link.click();
    await expect(page).toHaveURL(/\/admin\/analytics$/);
    await expect(link).toHaveAttribute("aria-current", "page");
  });

  test("the dashboard links to it and shows the paid orders of the last 30 days", async ({
    page,
  }) => {
    await openAnalytics(page, "", 1440);
    const overview = await analyticsFromApi(api, "overview", defaultFrom(), todayVn);
    await page.goto("/admin");
    const card = page.getByRole("link", { name: /^Analytics\s*\d+/ });
    await expect(card).toHaveAttribute("href", "/admin/analytics");
    await expect(card).toContainText(count(overview.current.orderCount));
    await expect(card).toContainText("Paid orders in the last 30 days");
    await card.click();
    await expect(page).toHaveURL(/\/admin\/analytics$/);
  });
});

test.describe("access", () => {
  test("a visitor who is not signed in is sent to sign in", async ({ page }) => {
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  });

  test("a customer is told that ADMIN access is required and gets no figures", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    await page.goto(PATH);
    await expect(
      page.getByRole("heading", { name: "ADMIN access required" }),
    ).toBeVisible();
    await expect(page.getByText("Revenue by day")).toHaveCount(0);

    // The data route says no as well, and passes the backend's refusal on.
    const refused = await page.request.get(
      `/api/admin/analytics/overview?from=${defaultFrom()}&to=${todayVn}`,
    );
    expect(refused.status()).toBe(403);
    expect(await refused.text()).not.toContain("revenue");
  });

  test("the data route refuses a visitor who is not signed in", async () => {
    const guest = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const response = await guest.get(
      `/api/admin/analytics/overview?from=${defaultFrom()}&to=${todayVn}`,
    );
    expect(response.status()).toBe(401);
    await guest.dispose();
  });

  test("the data route checks the range itself and never forwards a bad one", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    const get = (query: string, section = "overview") =>
      page.request.get(`/api/admin/analytics/${section}${query}`);

    expect((await get("?from=2026-02-30&to=2026-03-01")).status()).toBe(400);
    expect((await get(`?from=${todayVn}&to=${shiftDay(todayVn, -3)}`)).status()).toBe(400);
    expect((await get(`?from=${shiftDay(todayVn, -400)}&to=${todayVn}`)).status()).toBe(400);
    expect((await get(`?from=${todayVn}&to=${shiftDay(todayVn, 1)}`)).status()).toBe(400);
    expect((await get(`?from=${todayVn}`)).status()).toBe(400);
    expect((await get(`?from=${todayVn}&from=${todayVn}&to=${todayVn}`)).status()).toBe(400);
    expect((await get(`?from=${todayVn}&to=${todayVn}`, "users")).status()).toBe(404);

    // The time zone is fixed: a caller can not ask for an offset or another zone.
    const ok = await get(
      `?from=${todayVn}&to=${todayVn}&timezone=%2B07:00`,
    );
    expect(ok.status()).toBe(200);
    expect(((await ok.json()) as { range: { timezone: string } }).range.timezone).toBe(TIMEZONE);
  });
});

test.describe("the range", () => {
  test("the presets change the address and ask for that range", async ({ page }) => {
    const requests = watchAnalyticsRequests(page);
    await openAnalytics(page);
    const presets = page.getByRole("navigation", { name: "Range presets" });

    for (const days of [7, 90, 30]) {
      const from = shiftDay(todayVn, -(days - 1));
      requests.length = 0;
      await presets.getByRole("link", { name: `Last ${days} days`, exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(`/admin/analytics\\?from=${from}&to=${todayVn}$`),
      );
      await settled(page);
      // One picker and one set of sections: a new range replaces the old one.
      await expect(page.getByRole("navigation", { name: "Range presets" })).toHaveCount(1);
      await expect(page.locator("[data-range-summary]")).toHaveCount(1);
      await expect(page.getByRole("region", { name: "Key figures" })).toHaveCount(1);
      await expect(
        presets.getByRole("link", { name: `Last ${days} days`, exact: true }),
      ).toHaveAttribute("aria-current", "true");
      for (const other of [7, 30, 90].filter((entry) => entry !== days)) {
        await expect(
          presets.getByRole("link", { name: `Last ${other} days`, exact: true }),
        ).not.toHaveAttribute("aria-current", "true");
      }
      await expect(page.locator("[data-range-summary]")).toContainText(
        `${mediumDay(from)} to ${mediumDay(todayVn)} (${days} days)`,
      );
      // Each of the four sections asked for exactly this range.
      expect(sectionsRequested(requests, from, todayVn), `requests for ${days} days`).toEqual(
        ALL_SECTIONS,
      );
    }
  });

  test("back and forward move between ranges and the page follows", async ({ page }) => {
    await openAnalytics(page);
    const seven = shiftDay(todayVn, -6);
    await page
      .getByRole("navigation", { name: "Range presets" })
      .getByRole("link", { name: "Last 7 days", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`from=${seven}&to=${todayVn}$`));
    await settled(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/analytics$/);
    await settled(page);
    await expect(page.locator("[data-range-summary]")).toContainText("(30 days)");
    await expect(page.getByRole("navigation", { name: "Range presets" })).toHaveCount(1);
    await expect(page.getByLabel("From", { exact: true })).toHaveValue(defaultFrom());

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`from=${seven}&to=${todayVn}$`));
    await settled(page);
    await expect(page.locator("[data-range-summary]")).toContainText("(7 days)");
    await expect(page.getByLabel("From", { exact: true })).toHaveValue(seven);
    await expect(page.getByRole("region", { name: "Key figures" })).toHaveCount(1);
  });

  test("a preset shows one row per day in the data table", async ({ page }) => {
    await openAnalytics(page, `?from=${shiftDay(todayVn, -6)}&to=${todayVn}`);
    const revenue = region(page, "Revenue by day");
    await revenue.getByRole("button", { name: "Show data table" }).click();
    await expect(revenue.getByRole("button", { name: "Hide data table" })).toHaveAttribute("aria-expanded", "true");
    const fromApi = await analyticsFromApi(api, "revenue-by-day", shiftDay(todayVn, -6), todayVn);
    expect(fromApi.days).toHaveLength(7);
    await expect(revenue.getByRole("table", { name: "Revenue by day" }).getByRole("row")).toHaveCount(8);
  });

  test("a custom range is checked before anything is sent", async ({ page }) => {
    const requests = watchAnalyticsRequests(page);
    await openAnalytics(page);
    const form = page.getByRole("form", { name: "Custom range" });
    const from = form.getByLabel("From", { exact: true });
    const to = form.getByLabel("To", { exact: true });
    const alert = form.getByRole("alert");
    const before = requests.length;
    const url = page.url();

    // From after to.
    await from.fill("2026-11-10");
    await to.fill("2026-11-09");
    await form.getByRole("button", { name: "Apply range" }).click();
    await expect(alert).toHaveText("The start date must be on or before the end date.");
    await expect(from).toHaveAttribute("aria-invalid", "true");

    // An end date in the future.
    await from.fill(shiftDay(todayVn, -2));
    await to.fill(shiftDay(todayVn, 1));
    await form.getByRole("button", { name: "Apply range" }).click();
    await expect(alert).toHaveText(
      `The end date cannot be after today (${mediumDay(todayVn)}).`,
    );

    // 367 days: one more than the backend allows.
    await from.fill(shiftDay(todayVn, -366));
    await to.fill(todayVn);
    await form.getByRole("button", { name: "Apply range" }).click();
    await expect(alert).toHaveText(/367 days\. The longest range is 366 days\./);

    // A missing date.
    await from.fill("");
    await form.getByRole("button", { name: "Apply range" }).click();
    await expect(alert).toHaveText("Enter a start date.");

    // None of that left the page or reached the backend.
    expect(page.url()).toBe(url);
    expect(requests.length).toBe(before);
  });

  test("a valid custom range goes into the address, loads that range and survives a reload", async ({
    page,
  }) => {
    const requests = watchAnalyticsRequests(page);
    await openAnalytics(page);
    const from = shiftDay(todayVn, -9);
    const to = shiftDay(todayVn, -2);

    const form = page.getByRole("form", { name: "Custom range" });
    await form.getByLabel("From", { exact: true }).fill(from);
    await form.getByLabel("To", { exact: true }).fill(to);
    await form.getByRole("button", { name: "Apply range" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/analytics\\?from=${from}&to=${to}$`));
    await settled(page);

    await expect(page.locator("[data-range-summary]")).toContainText(
      `${mediumDay(from)} to ${mediumDay(to)} (8 days)`,
    );
    await expect(form.getByLabel("From", { exact: true })).toHaveValue(from);
    await expect(form.getByLabel("To", { exact: true })).toHaveValue(to);
    // No preset is current: it is not "the last N days ending today".
    await expect(
      page.getByRole("navigation", { name: "Range presets" }).locator('[aria-current="true"]'),
    ).toHaveCount(0);
    expect(sectionsRequested(requests, from, to)).toEqual(ALL_SECTIONS);

    const overview = await analyticsFromApi(api, "overview", from, to);
    expect(overview.range.days).toBe(8);
    await expectKpis(page, overview.current, overview.previous);

    await page.reload();
    await settled(page);
    await expect(page).toHaveURL(new RegExp(`/admin/analytics\\?from=${from}&to=${to}$`));
    await expect(page.locator("[data-range-summary]")).toContainText(
      `${mediumDay(from)} to ${mediumDay(to)} (8 days)`,
    );
    await expectKpis(page, overview.current, overview.previous);
  });

  test("the longest range, 366 days, is accepted", async ({ page }) => {
    const from = shiftDay(todayVn, -365);
    await openAnalytics(page, `?from=${from}&to=${todayVn}`);
    await expect(page.locator("[data-range-summary]")).toContainText("(366 days)");
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    const revenue = region(page, "Revenue by day");
    await revenue.getByRole("button", { name: "Show data table" }).click();
    await expect(revenue.getByRole("table").getByRole("row")).toHaveCount(367);
  });

  test("a range in the address that the backend would refuse is explained and never sent", async ({
    page,
  }) => {
    const requests = watchAnalyticsRequests(page);
    await signInAsAdmin(page);
    const bad: Array<[string, string]> = [
      ["?from=2026-02-30&to=2026-03-01", "The start date is not a valid date."],
      [`?from=${todayVn}&to=${shiftDay(todayVn, -1)}`, "The start date must be on or before the end date."],
      [`?from=${shiftDay(todayVn, -366)}&to=${todayVn}`, "367 days"],
      [`?from=${todayVn}&to=${shiftDay(todayVn, 3)}`, "cannot be after today"],
      ["?from=%2B07:00&to=2026-03-01", "The start date is not a valid date."],
      [`?from=${todayVn}&from=${todayVn}&to=${todayVn}`, "repeats"],
    ];
    for (const [query, reason] of bad) {
      requests.length = 0;
      await page.goto(`${PATH}${query}`);
      await settled(page);
      const notice = page
        .locator("main")
        .getByRole("alert")
        .filter({ hasText: "Showing the last 30 days instead" });
      await expect(notice, query).toContainText(reason);
      await expect(page.locator("[data-range-summary]"), query).toContainText("(30 days)");
      // Only the default range was asked for.
      for (const url of requests) {
        const parsed = new URL(url);
        expect(parsed.searchParams.get("from"), query).toBe(defaultFrom());
        expect(parsed.searchParams.get("to"), query).toBe(todayVn);
      }
      expect(sectionsRequested(requests, defaultFrom(), todayVn), query).toEqual(ALL_SECTIONS);
    }
  });

  test("only one end in the address follows the backend's own rule", async ({ page }) => {
    await openAnalytics(page, `?from=${shiftDay(todayVn, -4)}`);
    await expect(page.locator("[data-range-summary]")).toContainText(
      `${mediumDay(shiftDay(todayVn, -4))} to ${mediumDay(todayVn)} (5 days)`,
    );
    const to = shiftDay(todayVn, -3);
    await page.goto(`${PATH}?to=${to}`);
    await settled(page);
    await expect(page.locator("[data-range-summary]")).toContainText(
      `${mediumDay(shiftDay(to, -29))} to ${mediumDay(to)} (30 days)`,
    );
  });
});

test.describe("the figures equal the backend's", () => {
  test("the five key figures, with the change against the previous period", async ({
    page,
  }) => {
    await openAnalytics(page);
    const overview = await analyticsFromApi(api, "overview", defaultFrom(), todayVn);
    // This spec paid for two orders and cancelled one, so there is something to compare.
    expect(overview.current.orderCount).toBeGreaterThanOrEqual(2);
    expect(overview.current.cancelledOrders).toBeGreaterThanOrEqual(1);
    expect(overview.current.newCustomers).toBeGreaterThanOrEqual(1);
    expect(overview.previousRange.to).toBe(shiftDay(defaultFrom(), -1));
    await expectKpis(page, overview.current, overview.previous);
    await expect(region(page, "Key figures")).toContainText(
      `Compared with ${mediumDay(overview.previousRange.from)} to ${mediumDay(overview.previousRange.to)}`,
    );
  });

  test("shows up, down and new in words, from an answer with a previous period to compare", async ({
    page,
  }) => {
    // The test database has no history, so the previous period is empty. This
    // test hands the page an answer that has one, to see every kind of change.
    const base = await analyticsFromApi(api, "overview", defaultFrom(), todayVn);
    const figures = (over: Partial<Figures>): Figures => ({
      revenue: 0, orderCount: 0, averageOrderValue: 0, placedOrders: 0,
      cancelledOrders: 0, cancelledRate: 0, newCustomers: 0, ...over,
    });
    const current = figures({
      revenue: 1_550_000, orderCount: 5, averageOrderValue: 310_000,
      placedOrders: 7, cancelledOrders: 1, cancelledRate: 0.1429, newCustomers: 2,
    });
    const previous = figures({
      revenue: 250_000, orderCount: 3, averageOrderValue: 333_000,
      placedOrders: 4, cancelledOrders: 1, cancelledRate: 0.25, newCustomers: 0,
    });
    await page.route("**/api/admin/analytics/overview*", (route) =>
      route.fulfill({ json: { ...base, current, previous } }),
    );
    await openAnalytics(page);
    await expectKpis(page, current, previous);
    const card = (name: string) =>
      region(page, "Key figures").getByRole("article", { name, exact: true }).locator("[data-kpi-change]");
    await expect(card("Revenue")).toHaveText("Up 520.0%");
    await expect(card("Paid orders")).toHaveText("Up 66.7%");
    await expect(card("Average order value")).toHaveText("Down 6.9%");
    await expect(card("Cancelled rate")).toHaveText("Down 10.7 percentage points");
    await expect(card("New customers")).toHaveText("New, none in the previous period");
  });

  test("the revenue chart: totals, one bar per day, the readout and the data table", async ({
    page,
  }) => {
    await openAnalytics(page);
    const fromApi = await analyticsFromApi(api, "revenue-by-day", defaultFrom(), todayVn);
    const days = fromApi.days;
    expect(days).toHaveLength(30);
    const total = days.reduce((sum, day) => sum + day.revenue, 0);
    const orders = days.reduce((sum, day) => sum + day.orders, 0);
    expect(total).toBeGreaterThan(0);
    const best = days.reduce((a, b) => (b.revenue > a.revenue ? b : a));

    const revenue = region(page, "Revenue by day");
    const readout = revenue.locator("[data-chart-readout]");
    await expect(readout).toContainText(`Total ${vnd(total)}`);
    await expect(readout).toContainText(`from ${count(orders)} paid ${orders === 1 ? "order" : "orders"}`);
    await expect(readout).toContainText(`Best day: ${longDay(best.date)}`);

    // One slot for every day, the ones without orders included.
    await expect(revenue.locator('svg[role="img"] rect')).toHaveCount(30);
    await expect(revenue.locator('svg[role="img"]')).toHaveAccessibleName(
      /Bar chart of revenue for each of 30 days/,
    );
    // The axis is written short.
    await expect(revenue.locator("svg text").first()).toHaveText(/^\d+(\.\d)?[KMB]?$/);

    // Keyboard: the chart takes focus and the arrow keys read one day at a time.
    const chart = revenue.getByRole("group", { name: "Revenue by day chart" });
    await chart.focus();
    await page.keyboard.press("End");
    const last = days[days.length - 1];
    await expect(readout).toContainText(longDay(last.date));
    await expect(readout).toContainText(vnd(last.revenue));
    await expect(readout).toContainText(`from ${count(last.orders)} paid ${last.orders === 1 ? "order" : "orders"}`);
    await page.keyboard.press("Home");
    await expect(readout).toContainText(longDay(days[0].date));
    await page.keyboard.press("ArrowRight");
    await expect(readout).toContainText(longDay(days[1].date));
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(readout).toContainText(longDay(days[0].date));
    // Leaving the chart goes back to the summary.
    await page.keyboard.press("Tab");
    await expect(readout).toContainText(`Total ${vnd(total)}`);

    // Pointer: hovering the last slot reads the last day.
    const box = (await revenue.locator('svg[role="img"]').boundingBox())!;
    await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2);
    await expect(readout).toContainText(longDay(last.date));

    // The data table lists every day, as the backend returned them.
    await revenue.getByRole("button", { name: "Show data table" }).click();
    const table = revenue.getByRole("table", { name: "Revenue by day" });
    await expect(table.getByRole("row")).toHaveCount(31);
    for (const day of [days[0], best, last]) {
      const row = table.getByRole("row").filter({ hasText: longDay(day.date) });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(vnd(day.revenue));
      await expect(row.getByRole("cell").first()).toHaveText(count(day.orders));
    }
    await revenue.getByRole("button", { name: "Hide data table" }).click();
    await expect(table).toBeHidden();
  });

  test("orders by status lists the six statuses with the backend's counts and values", async ({
    page,
  }) => {
    await openAnalytics(page);
    const fromApi = await analyticsFromApi(api, "orders-by-status", defaultFrom(), todayVn);
    expect(fromApi.statuses.map((row) => row.status)).toEqual([
      "pending", "confirmed", "processing", "shipped", "delivered", "cancelled",
    ]);
    const section = region(page, "Orders by status");
    const labels: Record<string, string> = {
      pending: "Pending", confirmed: "Confirmed", processing: "Processing",
      shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
    };
    await expect(section.getByRole("listitem")).toHaveCount(6);
    for (const row of fromApi.statuses) {
      const item = section.locator(`[data-status="${row.status}"]`);
      await expect(item).toContainText(labels[row.status]);
      await expect(item.locator("[data-status-count]")).toHaveText(count(row.orderCount));
      await expect(item.locator("[data-status-value]")).toContainText(vnd(row.totalValue));
      await expect(item).toContainText(`${row.orderCount === 1 ? "order" : "orders"}`);
      const share = fromApi.totalOrders === 0 ? 0 : (row.orderCount / fromApi.totalOrders) * 100;
      await expect(item).toContainText(`(${share.toFixed(1)}%)`);
    }
    await expect(section).toContainText(`${count(fromApi.totalOrders)} orders were placed`);
    // This spec cancelled an order, so the cancelled row is not empty.
    expect(fromApi.statuses.find((row) => row.status === "cancelled")!.orderCount).toBeGreaterThanOrEqual(1);
  });

  test("best sellers: the products and categories in the backend's order, products linked", async ({
    page,
  }) => {
    await openAnalytics(page);
    const fromApi = await analyticsFromApi(api, "top-products", defaultFrom(), todayVn);
    expect(fromApi.products.length).toBeGreaterThan(0);
    const section = region(page, "Best sellers");

    const products = section.getByRole("table", { name: "Top products" });
    await expect(products.getByRole("row")).toHaveCount(fromApi.products.length + 1);
    for (const [index, entry] of fromApi.products.entries()) {
      const row = products.getByRole("row").nth(index + 1);
      await expect(row).toContainText(entry.name);
      await expect(row).toContainText(`${count(entry.orders)} ${entry.orders === 1 ? "order" : "orders"}`);
      await expect(row.getByRole("cell").nth(2)).toHaveText(count(entry.units));
      await expect(row.getByRole("cell").nth(3)).toContainText(vnd(entry.revenue));
      await expect(row.getByRole("link", { name: entry.name })).toHaveAttribute(
        "href",
        `/admin/products/${entry.id}`,
      );
    }

    const categories = section.getByRole("table", { name: "Top categories" });
    await expect(categories.getByRole("row")).toHaveCount(fromApi.categories.length + 1);
    for (const [index, entry] of fromApi.categories.entries()) {
      const row = categories.getByRole("row").nth(index + 1);
      await expect(row).toContainText(entry.name);
      await expect(row.getByRole("cell").nth(2)).toHaveText(count(entry.units));
      await expect(row.getByRole("cell").nth(3)).toContainText(vnd(entry.revenue));
      // There is no admin page for one category.
      await expect(row.getByRole("link")).toHaveCount(0);
    }

    // A product link opens that product's admin page.
    await products.getByRole("row").nth(1).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/admin/products/${fromApi.products[0].id}$`));
  });
});

test.describe("states", () => {
  const EMPTY = "?from=2001-01-01&to=2001-01-07";

  test("a range with no orders says so in each section and shows no table", async ({
    page,
  }) => {
    await openAnalytics(page, EMPTY);
    // The backend agrees that the range is empty.
    const overview = await analyticsFromApi(api, "overview", "2001-01-01", "2001-01-07");
    expect(overview.current.placedOrders).toBe(0);
    expect((await analyticsFromApi(api, "orders-by-status", "2001-01-01", "2001-01-07")).totalOrders).toBe(0);

    const figures = region(page, "Key figures");
    await expect(figures.getByText("No orders in this period")).toBeVisible();
    await expectKpis(page, overview.current, overview.previous);
    await expect(figures.getByRole("article", { name: "Revenue", exact: true })).toContainText("No change");

    await expect(region(page, "Revenue by day").getByText("No paid orders in this period")).toBeVisible();
    await expect(region(page, "Revenue by day").getByRole("button")).toHaveCount(0);
    await expect(region(page, "Orders by status").getByText("No orders in this period")).toBeVisible();
    await expect(region(page, "Orders by status").getByRole("listitem")).toHaveCount(0);
    const best = region(page, "Best sellers");
    await expect(best.getByText("No products sold in this period")).toBeVisible();
    await expect(best.getByText("No categories sold in this period")).toBeVisible();
    await expect(best.getByRole("table")).toHaveCount(0);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/NaN|Infinity|undefined/);
  });

  test("a section that fails says so and can be retried, the rest of the page stays", async ({
    page,
  }) => {
    const message = "The ranking is unavailable right now (test).";
    let failing = true;
    await page.route("**/api/admin/analytics/top-products*", (route) =>
      failing
        ? route.fulfill({ status: 500, json: { message } })
        : route.continue(),
    );
    await openAnalytics(page);

    const best = region(page, "Best sellers");
    await expect(best.getByRole("alert")).toContainText("Best sellers could not be loaded");
    await expect(best.getByRole("alert")).toContainText(message);
    await expect(best.getByRole("table")).toHaveCount(0);
    // Nothing else went blank.
    await expect(region(page, "Key figures").getByRole("article")).toHaveCount(5);
    await expect(region(page, "Revenue by day").locator("[data-chart-readout]")).toBeVisible();
    await expect(region(page, "Orders by status").getByRole("listitem")).toHaveCount(6);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(1);

    // Retry: only this section asks again, and it fills in.
    const requests = watchAnalyticsRequests(page);
    failing = false;
    await best.getByRole("button", { name: "Try again" }).click();
    await expect(best.getByRole("table", { name: "Top products" })).toBeVisible();
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    expect(requests.map((url) => new URL(url).pathname.split("/").pop())).toEqual(["top-products"]);
  });

  test("a request that never reaches the server is a readable error, not a browser message", async ({
    page,
  }) => {
    await page.route("**/api/admin/analytics/revenue-by-day*", (route) => route.abort());
    await openAnalytics(page);
    const revenue = region(page, "Revenue by day");
    await expect(revenue.getByRole("alert")).toContainText("Revenue by day could not be loaded");
    await expect(revenue.getByRole("alert")).toContainText(
      "This section could not be loaded. Please try again shortly.",
    );
    await expect(revenue.getByRole("alert")).not.toContainText(/Failed to fetch|NetworkError/i);
    await expect(region(page, "Key figures").getByRole("article")).toHaveCount(5);
  });

  test("every section shows a loading state first, and says what it loads", async ({
    page,
  }) => {
    // Hold one answer back to see the loading state.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/admin/analytics/orders-by-status*", async (route) => {
      await held;
      await route.continue();
    });
    await signInAsAdmin(page);
    await page.goto(PATH);
    const statuses = region(page, "Orders by status");
    await expect(statuses).toHaveAttribute("aria-busy", "true");
    await expect(statuses.getByRole("status")).toContainText("Loading orders by status");
    release();
    await settled(page);
    await expect(statuses.getByRole("listitem")).toHaveCount(6);
  });
});

test.describe("layout", () => {
  test("the page does not scroll sideways on a phone, with the table open too", async ({
    page,
  }) => {
    await openAnalytics(page, "", 390);
    const sideways = () => page.evaluate(() => document.documentElement.scrollWidth);
    expect(await sideways()).toBeLessThanOrEqual(390);
    await expect(region(page, "Key figures").getByRole("article")).toHaveCount(5);

    await region(page, "Revenue by day").getByRole("button", { name: "Show data table" }).click();
    expect(await sideways()).toBeLessThanOrEqual(390);

    // The chart fits its box, and the tables fit or scroll inside their own box.
    const fits = await page.evaluate(() => {
      const svg = document.querySelector('svg[aria-label^="Bar chart"]')!.getBoundingClientRect();
      const box = svg.width;
      const tables = Array.from(document.querySelectorAll("table")).map((table) => {
        const rect = table.closest("div")!.getBoundingClientRect();
        return rect.right;
      });
      return { box, tables };
    });
    expect(fits.box).toBeLessThanOrEqual(390);
    for (const right of fits.tables) expect(right).toBeLessThanOrEqual(390);

    // A validation message does not widen it either.
    const form = page.getByRole("form", { name: "Custom range" });
    await form.getByLabel("From", { exact: true }).fill(todayVn);
    await form.getByLabel("To", { exact: true }).fill(shiftDay(todayVn, -1));
    await form.getByRole("button", { name: "Apply range" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    expect(await sideways()).toBeLessThanOrEqual(390);

    // The empty state and the best-seller tables too.
    await page.goto(`${PATH}?from=2001-01-01&to=2001-01-07`);
    await settled(page);
    expect(await sideways()).toBeLessThanOrEqual(390);
  });

  test("the best-seller tables fit a phone without scrolling inside their own box", async ({
    page,
  }) => {
    await openAnalytics(page, "", 390);
    const tables = region(page, "Best sellers").getByRole("table");
    await expect(tables).toHaveCount(2);
    const overflow = await page.evaluate(() =>
      Array.from(document.querySelectorAll('table[aria-label^="Top "]')).map((table) => {
        const holder = table.parentElement!;
        return holder.scrollWidth - holder.clientWidth;
      }),
    );
    expect(overflow).toEqual([0, 0]);
  });

  for (const width of [1280, 1440, 1920]) {
    test(`the admin navigation and the site header fit at ${width}px`, async ({ page }) => {
      await openAnalytics(page, "", width);
      const fit = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Admin sections"]')!;
        const links = Array.from(nav.querySelectorAll("a"));
        const lines = (element: Element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size;
        };
        const store = document.querySelector('nav[aria-label="Store navigation"]')!;
        return {
          pageWidth: document.documentElement.scrollWidth,
          navRight: nav.getBoundingClientRect().right,
          rightmost: Math.max(...links.map((link) => link.getBoundingClientRect().right)),
          labelsThatWrap: links.filter((link) => lines(link) > 1).map((link) => link.textContent),
          count: links.length,
          labels: links.map((link) => link.textContent),
          // Free room in the site header row (the same measure as the header tests).
          slack: store.parentElement!.getBoundingClientRect().width - store.getBoundingClientRect().width,
        };
      });
      expect(fit.count).toBe(11);
      expect(fit.labels).toContain("Analytics");
      expect(fit.pageWidth).toBeLessThanOrEqual(width);
      expect(fit.rightmost).toBeLessThanOrEqual(fit.navRight + 0.5);
      expect(fit.rightmost).toBeLessThanOrEqual(width);
      expect(fit.labelsThatWrap).toEqual([]);
      expect(fit.slack, `free room in the header row at ${width}px`).toBeGreaterThanOrEqual(16);
    });
  }

  test("the page's own controls are at least 44px tall on a phone", async ({ page }) => {
    await openAnalytics(page, "", 390);
    const small = await page.evaluate(() => {
      const offenders: string[] = [];
      const controls = document.querySelectorAll(
        'section button, section a, nav[aria-label="Range presets"] a, form[aria-label="Custom range"] button, form[aria-label="Custom range"] input',
      );
      controls.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.height < 43.5) {
          offenders.push(`${element.textContent?.trim() || element.tagName} ${rect.height}px`);
        }
      });
      return offenders;
    });
    expect(small).toEqual([]);
  });
});
