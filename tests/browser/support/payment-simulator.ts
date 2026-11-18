import {
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Cookie,
  type Page,
} from "@playwright/test";
import { pageText } from "./banned-terms";
import { type TestShopper } from "./reconciliation";
import { API_URL, signIn } from "./shop";

// Helpers for the "Try a tricky case" tests. Orders are made the way a shopper
// makes them (checkout, then a payment) through a shopper of the spec's own, over
// the API; the browser only walks the demo payment page.

// ---- a shopper in the browser, signed in once ---------------------------------

let shopperCookies: Cookie[] | null = null;
let shopperCookiesAt = 0;
// The session token lasts 15 minutes; renew well before that.
const SESSION_MAX_AGE_MS = 8 * 60_000;

// Signs the page's context in as the spec's shopper. The first call (and one
// after eight minutes) logs in through the sign-in page; every other call reuses
// the cookies of that login, so the 20 logins a minute per email are not touched.
let browserLoginCount = 0;
export const browserLogins = () => browserLoginCount;

export async function signInAsShopper(
  page: Page,
  shopper: Pick<TestShopper, "email">,
): Promise<void> {
  const context: BrowserContext = page.context();
  if (
    shopperCookies === null ||
    Date.now() - shopperCookiesAt > SESSION_MAX_AGE_MS
  ) {
    browserLoginCount += 1;
    await signIn(page, shopper.email);
    shopperCookies = await context.cookies();
    shopperCookiesAt = Date.now();
    return;
  }
  await context.addCookies(shopperCookies);
}

// ---- orders and payments over the API ------------------------------------------

async function post<T>(
  request: APIRequestContext,
  token: string,
  path: string,
  data?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await request.post(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, ...headers },
    data,
  });
  expect(response.ok(), `POST ${path} answered ${response.status()}`).toBe(true);
  return (await response.json()) as T;
}

async function get<T>(
  request: APIRequestContext,
  token: string,
  path: string,
): Promise<T> {
  const response = await request.get(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `GET ${path} answered ${response.status()}`).toBe(true);
  return (await response.json()) as T;
}

// An unpaid order with a fresh open demo payment.
export async function startOpenPayment(
  request: APIRequestContext,
  shopper: TestShopper,
): Promise<{ orderId: number; paymentId: number }> {
  const order = await post<{ id: number }>(
    request,
    shopper.token,
    "/orders/checkout",
    {
      addressId: shopper.addressId,
      items: [{ variantId: shopper.variantId, quantity: 1 }],
    },
  );
  const payment = await post<{ id: number }>(
    request,
    shopper.token,
    `/orders/${order.id}/payments`,
    undefined,
    { "Idempotency-Key": `simulator-${order.id}-${Date.now()}` },
  );
  return { orderId: order.id, paymentId: payment.id };
}

export interface BackendState {
  payment: { id: number; status: string };
  order: { id: number; status: string };
}

// What the backend says about the payment and its order now.
export async function backendState(
  request: APIRequestContext,
  shopper: TestShopper,
  orderId: number,
  paymentId: number,
): Promise<BackendState> {
  const payments = await get<Array<{ id: number; status: string }>>(
    request,
    shopper.token,
    `/orders/${orderId}/payments`,
  );
  const payment = payments.find((entry) => entry.id === paymentId);
  expect(payment, `payment ${paymentId} of order ${orderId}`).toBeTruthy();
  const order = await get<{ id: number; status: string }>(
    request,
    shopper.token,
    `/orders/${orderId}`,
  );
  return { payment: payment!, order };
}

// The payment finished as "failed" (used to make a page's payment refuse a case).
export async function failPayment(
  request: APIRequestContext,
  shopper: TestShopper,
  paymentId: number,
): Promise<void> {
  await post(request, shopper.token, `/payments/${paymentId}/demo/complete`, {
    outcome: "failure",
  });
}

// ---- reading the page ------------------------------------------------------------

export const RESULT = '[data-simulator-result]';

// The words a shopper (or a screen reader) gets from the page, WITHOUT the result
// panel of the tricky cases.
//
// The panel shows the backend's own explanation of what the demo did, and that
// text names internals on purpose ("API", "idempotency", the "reconciliation
// queue"). The page is labelled "Demo payment. No real money is charged.", and
// explaining how the payment flow behaves is the point of the panel, so the panel
// is the one place exempt from the banned-terms scan, and only that panel: the
// buttons, their descriptions, the messages and everything else on the page stay
// scanned in full. The guard itself (support/banned-terms.ts) is unchanged.
export async function pageTextOutsideResult(page: Page): Promise<string> {
  const whole = await pageText(page);
  const panel = page.locator(RESULT);
  if ((await panel.count()) === 0) return whole;
  const panelText = await panel.innerText();
  const panelLabels = await panel.evaluate((node) =>
    Array.from(node.querySelectorAll("[aria-label]")).map(
      (child) => child.getAttribute("aria-label") ?? "",
    ),
  );
  let rest = whole.replace(panelText, "");
  for (const label of panelLabels) rest = rest.replace(label, "");
  return rest;
}

// Text elements inside `selector` whose colour is below 4.5:1 against the colour
// behind them (the nearest ancestor with a background).
export async function lowContrast(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    const parse = (value: string) => {
      const context = document.createElement("canvas").getContext("2d")!;
      context.fillStyle = "#000";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a };
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const [lr, lg, lb] = [r, g, b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    const background = (element: Element | null) => {
      for (let node = element; node; node = node.parentElement) {
        const colour = parse(getComputedStyle(node).backgroundColor);
        if (colour.a === 255) return colour;
      }
      return { r: 255, g: 255, b: 255, a: 255 };
    };
    const failures: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || !(node.textContent ?? "").trim()) continue;
      if (!element.checkVisibility({ visibilityProperty: true })) continue;
      const text = parse(getComputedStyle(element).color);
      const behind = background(element);
      const [light, dark] = [luminance(text), luminance(behind)].sort((x, y) => y - x);
      const ratio = (light + 0.05) / (dark + 0.05);
      if (ratio < 4.5) {
        failures.push(
          `${ratio.toFixed(2)}:1 "${(node.textContent ?? "").trim().slice(0, 40)}"`,
        );
      }
    }
    return failures;
  });
}
