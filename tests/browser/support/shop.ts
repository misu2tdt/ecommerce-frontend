import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Shared steps for the browser tests that walk the real shop against the seeded
// backend (started by the smoke harness with PAYMENT_PROVIDER=demo). The seeded
// demo customer is the account `seed:demo:test` creates and the public demo uses.

export const PASSWORD = "DemoOnly!2026";
export const CUSTOMER = "demo.customer@example.com";
export const OTHER_USER = "demo.admin@example.com";
export const BASE_URL = "http://localhost:3001";
export const API_URL = "http://localhost:3000";

export async function signIn(page: Page, email: string, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace("/", "\\/")}$`));
}

// The test seed finds its own delivered order by the seeded shipping address,
// so orders shipped to that address would break the next `seed:demo:test`.
// These tests ship to an address of their own, saved once as the default.
const TEST_ADDRESS_LABEL = "Payment test address";

export async function ensureOwnShippingAddress(page: Page) {
  await page.goto("/account/addresses");
  if (await page.getByRole("heading", { name: TEST_ADDRESS_LABEL }).count()) {
    return;
  }

  // Saved addresses have "Update address" forms; only the new one says "Save".
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Save address" }),
  });
  await form.getByLabel("Label").fill(TEST_ADDRESS_LABEL);
  await form.getByLabel("Recipient name").fill("Payment Tester");
  await form.getByLabel("Phone").fill("0900000000");
  await form.getByLabel("Address line 1").fill("1 Test Street");
  await form.getByLabel("City").fill("Ho Chi Minh City");
  await form.getByLabel("Use as my default shipping address").check();
  await form.getByRole("button", { name: "Save address" }).click();
  await expect(
    page.getByRole("heading", { name: TEST_ADDRESS_LABEL }).first(),
  ).toBeVisible();
}

// Adds one product to the cart (the socks have a large stock).
export async function addSocksToCart(page: Page) {
  await page.goto("/products/cushioned-cotton-crew-socks-3-pack");
  await page.waitForLoadState("networkidle");
  const sizes = page.locator(
    '[aria-label="Available sizes"] button:not([disabled]):not([aria-disabled="true"])',
  );
  if (await sizes.count()) await sizes.first().click();
  // Phones also show a sticky bar with the same button, so take the first.
  await page.getByRole("button", { name: "Add to Bag" }).first().click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
}

// Adds a product to the cart, checks out and returns the new order id.
export async function placeOrder(page: Page): Promise<number> {
  await ensureOwnShippingAddress(page);
  await addSocksToCart(page);
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/checkout\/success\/\d+$/);
  return Number(new URL(page.url()).pathname.split("/").pop());
}

// Starts a payment from the order page and lands on the demo payment page.
export async function startPayment(page: Page, orderId: number) {
  await page.goto(`/account/orders/${orderId}`);
  await page.getByRole("button", { name: "Pay now" }).click();
  await page.waitForURL(/\/demo-pay\/\d+\?order=\d+$/);
  const paymentId = Number(new URL(page.url()).pathname.split("/").pop());
  return {
    paymentId,
    href: new URL(page.url()).pathname + new URL(page.url()).search,
  };
}

export const orderStatus = (page: Page, label: string) =>
  page.locator(`[aria-label="Order status: ${label}"]`).first();

export const paymentHistory = (page: Page) =>
  page.getByRole("region", { name: "Payment history" });

// Product photos come from an external host and have nothing to do with the
// flows under test, so they never slow these tests down.
export async function skipProductPhotos(page: Page) {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
}

// Signs in through the API and returns the bearer token.
export async function apiLogin(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  expect(login.ok(), "the API login should work").toBe(true);
  return ((await login.json()) as { access_token: string }).access_token;
}

// Reads the backend directly (as a signed-in customer), to compare what the page
// shows with what the backend says.
export async function apiGet<T>(
  request: APIRequestContext,
  email: string,
  path: string,
): Promise<T> {
  const token = await apiLogin(request, email);
  const response = await request.get(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `GET ${path}`).toBe(true);
  return (await response.json()) as T;
}

// Places `count` one-pair orders for the account through the API (fast), so a
// list has more than one page. Uses the account's own saved test address.
export async function createOrdersViaApi(
  request: APIRequestContext,
  email: string,
  count: number,
): Promise<void> {
  const token = await apiLogin(request, email);
  const headers = { Authorization: `Bearer ${token}` };
  const addresses = (await (
    await request.get(`${API_URL}/addresses`, { headers })
  ).json()) as Array<{ id: number; label: string | null }>;
  const address = addresses.find((entry) => entry.label === TEST_ADDRESS_LABEL);
  expect(address, "the test address exists (place an order in the UI first)").toBeTruthy();
  const product = (await (
    await request.get(
      `${API_URL}/products/slug/cushioned-cotton-crew-socks-3-pack`,
    )
  ).json()) as { variants: Array<{ id: number; stock: number }> };
  const variant = product.variants.find((entry) => entry.stock > count);
  expect(variant, "a socks variant with enough stock").toBeTruthy();

  for (let index = 0; index < count; index += 1) {
    const response = await request.post(`${API_URL}/orders/checkout`, {
      headers,
      data: {
        addressId: address!.id,
        items: [{ variantId: variant!.id, quantity: 1 }],
      },
    });
    expect(response.ok(), `placing order ${index + 1}`).toBe(true);
  }
}
// Independent of the app's own formatter: the Vietnam wall-clock time of an
// instant is that instant plus seven hours, read as UTC.
export function vietnamParts(instant: string) {
  const shifted = new Date(new Date(instant).getTime() + 7 * 3_600_000);
  const months = [
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
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${shifted.getUTCDate()} ${months[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}
