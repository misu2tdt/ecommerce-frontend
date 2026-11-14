import {
  expect,
  type APIRequestContext,
  type APIResponse,
  type BrowserContext,
  type Cookie,
  type Page,
} from "@playwright/test";
import { API_URL, OTHER_USER, PASSWORD, signIn } from "./shop";

// Test data for the reconciliation queue, made the way a shopper makes it: the
// demo payment is completed after the order was cancelled (a late success), or a
// failure arrives after a success. The backend records both for review. No row
// is written to the database directly and the base seed is not touched.
//
// Events can not be deleted through the API. The spec resolves every event it
// opened when it ends (resolveOpenEventsOf), so the open queue is back to what
// it was, also when a test failed.
//
// Logins are rationed: the backend allows 20 a minute per email. The admin logs
// in once per worker for the API (the token is cached and renewed only after a
// 401) and once for the browser (the session cookies are reused by every test
// and renewed before the 15 minute token runs out). The shopper logs in once.

export interface TestEvent {
  eventId: number;
  orderId: number;
  paymentId: number;
}

export interface ApiEvent {
  id: number;
  createdAt: string;
  eventType: string;
  processingMessage: string | null;
  provider: string;
  providerPaymentId: string;
  payment: { id: number; status: string; amount: number; currency: string };
  order: { id: number; status: string; userId: number };
  suggestedAction: string;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resolutionNote: string | null;
}

interface EventsPage {
  items: ApiEvent[];
  page: number;
  limit: number;
  total: number;
}

export interface TestShopper {
  email: string;
  userId: number;
  token: string;
  addressId: number;
  variantId: number;
}

const SOCKS = "cushioned-cotton-crew-socks-3-pack";

// How many logins this worker has made, for the admin and the shopper. The
// spec prints them so a run shows how close it is to the limit.
const loginCounts = { adminApi: 0, adminBrowser: 0, shopper: 0 };
export const loginsPerformed = () => ({ ...loginCounts });

// A refused login says why: a 429 is the rate limit, not a wrong password.
async function login(
  request: APIRequestContext,
  email: string,
  counter: keyof typeof loginCounts,
): Promise<string> {
  loginCounts[counter] += 1;
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  if (!response.ok()) {
    const body = (await response.text()).slice(0, 300);
    const retry = response.headers()["retry-after"];
    throw new Error(
      `Login of ${email} was refused: HTTP ${response.status()}` +
        (response.status() === 429
          ? ` (throttled; the limit is 20 a minute per email${retry ? `, retry after ${retry}s` : ""})`
          : "") +
        `. Body: ${body}. Logins so far: ${JSON.stringify(loginCounts)}`,
    );
  }
  return ((await response.json()) as { access_token: string }).access_token;
}

// ---- the admin over the API ------------------------------------------------

let cachedAdminToken: string | null = null;

async function adminToken(
  request: APIRequestContext,
  renew = false,
): Promise<string> {
  if (renew || cachedAdminToken === null) {
    cachedAdminToken = await login(request, OTHER_USER, "adminApi");
  }
  return cachedAdminToken;
}

// One admin request with the cached token. A 401 means the token ran out, so it
// is renewed and the request is sent once more.
async function adminCall(
  request: APIRequestContext,
  method: "get" | "post",
  path: string,
  data?: unknown,
): Promise<APIResponse> {
  const send = async (token: string) =>
    request[method](`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  const response = await send(await adminToken(request));
  if (response.status() !== 401) return response;
  return send(await adminToken(request, true));
}

export function adminGet(request: APIRequestContext, path: string) {
  return adminCall(request, "get", path);
}

export async function adminUserId(request: APIRequestContext): Promise<number> {
  const me = await adminGet(request, "/auth/me");
  expect(me.ok(), "reading the admin account").toBe(true);
  return ((await me.json()) as { id: number }).id;
}

export async function listEvents(
  request: APIRequestContext,
  status: "unresolved" | "resolved" | "all",
  page = 1,
  limit = 20,
): Promise<EventsPage> {
  const response = await adminGet(
    request,
    `/admin/payments/reconciliation?status=${status}&page=${page}&limit=${limit}`,
  );
  expect(
    response.ok(),
    `listing ${status} events answered ${response.status()}`,
  ).toBe(true);
  return (await response.json()) as EventsPage;
}

export async function resolveViaApi(
  request: APIRequestContext,
  eventId: number,
  note: string,
): Promise<number> {
  const response = await adminCall(
    request,
    "post",
    `/admin/payments/reconciliation/${eventId}/resolve`,
    { note },
  );
  return response.status();
}

// Every event that is still open and passes `keep`, over all pages. The ids are
// collected first, because resolving moves rows between pages.
async function openEvents(
  request: APIRequestContext,
  keep: (event: ApiEvent) => boolean,
): Promise<ApiEvent[]> {
  const found: ApiEvent[] = [];
  for (let page = 1; ; page += 1) {
    const result = await listEvents(request, "unresolved", page, 100);
    found.push(...result.items.filter(keep));
    if (page * result.limit >= result.total) return found;
  }
}

// Resolves the open events that pass `keep` (all of them when omitted). An event
// that is already resolved (409) is what the caller wants, so it is not an error;
// any other answer is. Returns how many were resolved now.
export async function resolveOpenEvents(
  request: APIRequestContext,
  note: string,
  keep: (event: ApiEvent) => boolean = () => true,
): Promise<number> {
  let resolved = 0;
  for (const event of await openEvents(request, keep)) {
    const status = await resolveViaApi(request, event.id, note);
    expect([200, 409], `resolving event ${event.id}`).toContain(status);
    if (status === 200) resolved += 1;
  }
  return resolved;
}

// Everything of the shopper that is still open: also an event the spec lost
// track of because a test or its set-up failed half way.
export function resolveOpenEventsOf(
  request: APIRequestContext,
  shopper: Pick<TestShopper, "userId">,
  note: string,
) {
  return resolveOpenEvents(
    request,
    note,
    (event) => event.order.userId === shopper.userId,
  );
}

// ---- the admin in the browser ----------------------------------------------

let adminCookies: Cookie[] | null = null;
let adminCookiesAt = 0;
// The session token lasts 15 minutes; renew well before that.
const SESSION_MAX_AGE_MS = 8 * 60_000;

// Signs the page's context in as the admin. The first call (and one after eight
// minutes) logs in through the sign-in page; every other call reuses the
// cookies of that login.
export async function signInAsAdmin(page: Page): Promise<void> {
  const context: BrowserContext = page.context();
  if (
    adminCookies === null ||
    Date.now() - adminCookiesAt > SESSION_MAX_AGE_MS
  ) {
    loginCounts.adminBrowser += 1;
    await signIn(page, OTHER_USER, "/admin");
    adminCookies = await context.cookies();
    adminCookiesAt = Date.now();
    return;
  }
  await context.addCookies(adminCookies);
}

// ---- the shopper -----------------------------------------------------------

// A shopper of their own, so the seeded customer's orders and address stay as
// the other tests and the test seed expect them.
export async function createShopper(
  request: APIRequestContext,
  stockNeeded: number,
): Promise<TestShopper> {
  const email = `reconciliation-${Date.now()}@example.test`;
  const registered = await request.post(`${API_URL}/users/register`, {
    data: { email, password: PASSWORD },
  });
  expect(
    registered.ok(),
    `registering the shopper answered ${registered.status()}`,
  ).toBe(true);
  const token = await login(request, email, "shopper");
  const headers = { Authorization: `Bearer ${token}` };

  const me = await request.get(`${API_URL}/auth/me`, { headers });
  expect(me.ok(), "reading the shopper account").toBe(true);
  const userId = ((await me.json()) as { id: number }).id;

  const address = await request.post(`${API_URL}/addresses`, {
    headers,
    data: {
      label: "Reconciliation test address",
      recipientName: "Reconciliation Tester",
      phone: "0900000000",
      addressLine1: "1 Test Street",
      addressLine2: null,
      ward: null,
      district: null,
      city: "Ho Chi Minh City",
      stateProvince: null,
      postalCode: null,
      countryCode: "VN",
      isDefault: true,
    },
  });
  expect(address.ok(), "saving the shopper's address").toBe(true);

  const product = (await (
    await request.get(`${API_URL}/products/slug/${SOCKS}`)
  ).json()) as { variants: Array<{ id: number; stock: number }> };
  const variant = product.variants.find((entry) => entry.stock > stockNeeded);
  expect(variant, "a socks variant with enough stock").toBeTruthy();

  return {
    email,
    userId,
    token,
    addressId: ((await address.json()) as { id: number }).id,
    variantId: variant!.id,
  };
}

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
  expect(response.ok(), `POST ${path} answered ${response.status()}`).toBe(
    true,
  );
  return (await response.json()) as Record<string, unknown>;
}

// An unpaid order with an open payment.
async function orderWithPayment(
  request: APIRequestContext,
  shopper: TestShopper,
) {
  const order = await post(request, shopper.token, "/orders/checkout", {
    addressId: shopper.addressId,
    items: [{ variantId: shopper.variantId, quantity: 1 }],
  });
  const orderId = order.id as number;
  const payment = await post(
    request,
    shopper.token,
    `/orders/${orderId}/payments`,
    undefined,
    { "Idempotency-Key": `reconciliation-${orderId}-${Date.now()}` },
  );
  return { orderId, paymentId: payment.id as number };
}

async function complete(
  request: APIRequestContext,
  shopper: TestShopper,
  paymentId: number,
  outcome: "success" | "failure" | "cancel",
) {
  return post(request, shopper.token, `/payments/${paymentId}/demo/complete`, {
    outcome,
  });
}

// The event the backend recorded for a payment, found through the admin list.
async function findEventOfPayment(
  request: APIRequestContext,
  paymentId: number,
): Promise<number> {
  const page = await listEvents(request, "all", 1, 100);
  const found = page.items.find((item) => item.payment.id === paymentId);
  expect(found, `a reconciliation event for payment ${paymentId}`).toBeTruthy();
  return found!.id;
}

// A success that arrives after the order was cancelled.
export async function createLateSuccessEvent(
  request: APIRequestContext,
  shopper: TestShopper,
): Promise<TestEvent> {
  const { orderId, paymentId } = await orderWithPayment(request, shopper);
  await post(request, shopper.token, `/orders/${orderId}/cancel`);
  const answer = await complete(request, shopper, paymentId, "success");
  expect(answer.result, "the late success is recorded for review").toBe(
    "recorded_for_review",
  );
  return {
    orderId,
    paymentId,
    eventId: await findEventOfPayment(request, paymentId),
  };
}

// A failure that arrives after the payment already succeeded (the order stays
// confirmed, so this one has event type "failed" and a confirmed order).
export async function createFailureAfterSuccessEvent(
  request: APIRequestContext,
  shopper: TestShopper,
): Promise<TestEvent> {
  const { orderId, paymentId } = await orderWithPayment(request, shopper);
  await complete(request, shopper, paymentId, "success");
  const answer = await complete(request, shopper, paymentId, "failure");
  expect(answer.result, "the late failure is recorded for review").toBe(
    "recorded_for_review",
  );
  return {
    orderId,
    paymentId,
    eventId: await findEventOfPayment(request, paymentId),
  };
}
