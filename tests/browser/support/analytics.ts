import {
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { API_URL } from "./shop";
import {
  adminGet,
  type TestShopper,
} from "./reconciliation";

// Helpers for the analytics page tests. Orders are made the way a shopper makes
// them (checkout, then the demo payment), through the shopper the spec
// registered. A paid order can not be cancelled or deleted (there are no
// refunds), so the orders this spec pays for stay in the test database; the
// unpaid one it makes is cancelled again.

export const TIMEZONE = "Asia/Ho_Chi_Minh";

// ---- calendar days, independent of the app's own helpers ---------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Vietnam is UTC+7 all year: its date is the UTC date of "now plus seven hours".
export function vietnamToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function shiftDay(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function shortDay(day: string): string {
  const [, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]}`;
}

export function mediumDay(day: string): string {
  return `${shortDay(day)} ${day.slice(0, 4)}`;
}

export function longDay(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return `${WEEKDAYS[weekday]} ${mediumDay(day)}`;
}

// ---- the analytics API, as the page's own requests should answer ---------------

export interface ApiOverview {
  range: { from: string; to: string; days: number; timezone: string };
  previousRange: { from: string; to: string; days: number };
  current: Figures;
  previous: Figures;
}

export interface Figures {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  placedOrders: number;
  cancelledOrders: number;
  cancelledRate: number;
  newCustomers: number;
}

export interface ApiRevenueByDay {
  range: { from: string; to: string; days: number; timezone: string };
  days: Array<{ date: string; revenue: number; orders: number }>;
}

export interface ApiStatuses {
  totalOrders: number;
  statuses: Array<{ status: string; orderCount: number; totalValue: number }>;
}

export interface ApiTopEntry {
  id: number;
  name: string;
  slug: string;
  units: number;
  revenue: number;
  orders: number;
}

export interface ApiTop {
  limit: number;
  products: ApiTopEntry[];
  categories: ApiTopEntry[];
}

export interface ApiAnalytics {
  "overview": ApiOverview;
  "revenue-by-day": ApiRevenueByDay;
  "orders-by-status": ApiStatuses;
  "top-products": ApiTop;
}

// The backend's own answer for a range, with the cached admin login.
export async function analyticsFromApi<S extends keyof ApiAnalytics>(
  request: APIRequestContext,
  section: S,
  from: string,
  to: string,
): Promise<ApiAnalytics[S]> {
  const extra = section === "top-products" ? "&limit=10" : "";
  const response = await adminGet(
    request,
    `/admin/analytics/${section}?from=${from}&to=${to}&timezone=${TIMEZONE}${extra}`,
  );
  expect(
    response.ok(),
    `GET /admin/analytics/${section} ${from}..${to} answered ${response.status()}`,
  ).toBe(true);
  return (await response.json()) as ApiAnalytics[S];
}

// ---- data for a non-empty range ----------------------------------------------

async function post(
  request: APIRequestContext,
  token: string,
  path: string,
  data?: unknown,
  headers: Record<string, string> = {},
) {
  const response = await request.post(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, ...headers },
    data,
  });
  expect(response.ok(), `POST ${path} answered ${response.status()}`).toBe(true);
  return (await response.json()) as Record<string, unknown>;
}

async function checkout(
  request: APIRequestContext,
  shopper: TestShopper,
  quantity: number,
): Promise<number> {
  const order = await post(request, shopper.token, "/orders/checkout", {
    addressId: shopper.addressId,
    items: [{ variantId: shopper.variantId, quantity }],
  });
  return order.id as number;
}

// An order that is paid: checkout, then the demo payment succeeds, which moves
// the order to "confirmed" (it counts as revenue from then on).
export async function placePaidOrder(
  request: APIRequestContext,
  shopper: TestShopper,
  quantity: number,
): Promise<number> {
  const orderId = await checkout(request, shopper, quantity);
  const payment = await post(
    request,
    shopper.token,
    `/orders/${orderId}/payments`,
    undefined,
    { "Idempotency-Key": `analytics-${orderId}-${Date.now()}` },
  );
  const result = await post(
    request,
    shopper.token,
    `/payments/${payment.id as number}/demo/complete`,
    { outcome: "success" },
  );
  expect(result.result, "the demo payment is applied").not.toBe(
    "recorded_for_review",
  );
  return orderId;
}

// An order that is cancelled before it was paid (counts as cancelled, not as
// revenue).
export async function placeCancelledOrder(
  request: APIRequestContext,
  shopper: TestShopper,
): Promise<number> {
  const orderId = await checkout(request, shopper, 1);
  await post(request, shopper.token, `/orders/${orderId}/cancel`);
  return orderId;
}

// ---- the page ----------------------------------------------------------------

// Waits until every section has an answer (loaded or failed), not a skeleton.
export async function settled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('section[aria-busy="true"]')).toHaveCount(0);
}

// The analytics requests a page makes, newest last.
export function watchAnalyticsRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/admin/analytics/")) {
      urls.push(request.url());
    }
  });
  return urls;
}

export function sectionsRequested(
  urls: string[],
  from: string,
  to: string,
): string[] {
  return urls
    .map((url) => new URL(url))
    .filter(
      (url) =>
        url.searchParams.get("from") === from &&
        url.searchParams.get("to") === to,
    )
    .map((url) => url.pathname.split("/").pop()!)
    .sort();
}
