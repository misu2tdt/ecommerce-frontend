import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { findBannedTerms, pageText } from "./support/banned-terms";
import {
  MIN_READABLE_SHARE,
  measureReadableShare,
} from "./support/readable-share";

// The demo store has no real payment provider: an order is paid on a clearly
// labelled practice page. These tests walk the whole money path in a browser
// against the real seeded backend, which the smoke harness starts with
// PAYMENT_PROVIDER=demo. The seeded demo customer used here is the same account
// that seed:demo:test creates and the public demo uses.
//
// Each order takes one pair of socks (a large stock). After many local runs,
// `npm run seed:demo:test` in the backend resets the stock.

const PASSWORD = "DemoOnly!2026";
const CUSTOMER = "demo.customer@example.com";
const OTHER_USER = "demo.admin@example.com";
const BASE_URL = "http://localhost:3001";

async function signIn(page: Page, email: string, next = "/account") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace("/", "\\/")}$`));
}

// The backend allows 10 sign-ins a minute per client, and every test needs a
// signed-in shopper. Each account really signs in once per worker; later tests
// reuse its session cookies.
type SessionCookies = Parameters<BrowserContext["addCookies"]>[0];
const sessions = new Map<string, SessionCookies>();

async function signedIn(page: Page, email: string) {
  const cached = sessions.get(email);
  if (cached) {
    await page.context().addCookies(cached);
    return;
  }
  await signIn(page, email);
  sessions.set(email, await page.context().cookies());
}

// The test seed finds its own delivered order by the seeded shipping address,
// so orders shipped to that address would break the next `seed:demo:test`.
// These tests ship to an address of their own, saved once as the default.
const TEST_ADDRESS_LABEL = "Payment test address";

async function ensureOwnShippingAddress(page: Page) {
  await page.goto("/account/addresses");
  if (await page.getByRole("heading", { name: TEST_ADDRESS_LABEL }).count()) return;

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

// Adds a product to the cart, checks out and returns the new order id.
async function placeOrder(page: Page): Promise<number> {
  await ensureOwnShippingAddress(page);
  await page.goto("/products/cushioned-cotton-crew-socks-3-pack");
  await page.waitForLoadState("networkidle");
  const sizes = page.locator(
    '[aria-label="Available sizes"] button:not([disabled])',
  );
  if (await sizes.count()) await sizes.first().click();
  // Phones also show a sticky bar with the same button, so take the first.
  await page.getByRole("button", { name: "Add to Bag" }).first().click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/checkout\/success\/\d+$/);
  return Number(new URL(page.url()).pathname.split("/").pop());
}

// Starts a payment from the order page and lands on the demo payment page.
async function startPayment(page: Page, orderId: number) {
  await page.goto(`/account/orders/${orderId}`);
  await page.getByRole("button", { name: "Pay now" }).click();
  await page.waitForURL(/\/demo-pay\/\d+\?order=\d+$/);
  const paymentId = Number(new URL(page.url()).pathname.split("/").pop());
  return { paymentId, href: new URL(page.url()).pathname + new URL(page.url()).search };
}

const orderStatus = (page: Page, label: string) =>
  page.locator(`[aria-label="Order status: ${label}"]`).first();
const paymentHistory = (page: Page) =>
  page.getByRole("region", { name: "Payment history" });

async function expectOrderPage(page: Page, orderId: number) {
  await expect(page).toHaveURL(new RegExp(`/account/orders/${orderId}$`));
  await expect(page.locator("h1")).toHaveText(`Order #${orderId}`);
}

test.beforeEach(async ({ page }) => {
  // Product photos come from an external host and have nothing to do with
  // payments, so they never slow these tests down.
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
});

test("the demo payment page is clearly a demo and fits every screen", async ({
  page,
}) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  await page.goto(`/account/orders/${orderId}`);
  const total = (await page.locator("main p.text-heading").first().innerText()).trim();
  const { paymentId } = await startPayment(page, orderId);
  await page.waitForLoadState("networkidle");

  // A banner that cannot be missed, one h1, and the real order and amount.
  await expect(
    page.getByText("Demo payment. No real money is charged."),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByText(`#${orderId}`, { exact: true })).toBeVisible();
  await expect(page.getByText(total, { exact: true })).toBeVisible();
  await expect(page).toHaveTitle(/Demo payment \| VERVE STUDIO/);

  // Exactly the three choices, all with a comfortable tap target.
  const choices = ["Pay now", "Simulate a failed payment", "Cancel payment"];
  for (const name of choices) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator("main button")).toHaveCount(choices.length);

  // The amount is never something a visitor can type or change.
  await expect(page.locator('main input:not([type="hidden"])')).toHaveCount(0);
  const hiddenNames = await page
    .locator('main input[type="hidden"]')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).name));
  expect(hiddenNames.sort()).toEqual(["orderId", "paymentId"]);
  expect(page.url()).not.toMatch(/amount/i);

  // Shopper language, same banned terms as every other customer page.
  expect(findBannedTerms(await pageText(page))).toEqual([]);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth, `page width at ${width}px`).toBeLessThanOrEqual(width);
    const { total: characters, readable } = await measureReadableShare(page);
    console.log(
      `[readable text] demo payment @${width}px: ${((readable / characters) * 100).toFixed(1)}% of ${characters} characters`,
    );
    expect(
      readable / characters,
      `readable text at ${width}px (${characters} characters)`,
    ).toBeGreaterThanOrEqual(MIN_READABLE_SHARE);
  }
  expect(paymentId).toBeGreaterThan(0);
});

test("Pay now confirms the order", async ({ page }) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  await startPayment(page, orderId);

  await page.getByRole("button", { name: "Pay now", exact: true }).click();

  await expectOrderPage(page, orderId);
  await expect(orderStatus(page, "Confirmed")).toBeVisible();
  await expect(paymentHistory(page)).toContainText("Paid with: Demo payment");
  await expect(paymentHistory(page)).toContainText("succeeded");
  await expect(
    page.getByRole("heading", { name: "Payment confirmed" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your demo payment went through and this order has been updated."),
  ).toBeVisible();
  // Paid: no second payment can be started.
  await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);
  expect(findBannedTerms(await pageText(page))).toEqual([]);
});

test("a failed payment leaves the order pending and paying again works", async ({
  page,
}) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  const first = await startPayment(page, orderId);

  await page
    .getByRole("button", { name: "Simulate a failed payment", exact: true })
    .click();

  await expectOrderPage(page, orderId);
  await expect(orderStatus(page, "Pending")).toBeVisible();
  await expect(paymentHistory(page)).toContainText("failed");
  // The pay-again control is back and works.
  const second = await startPayment(page, orderId);
  expect(second.paymentId).not.toBe(first.paymentId);
  await page.getByRole("button", { name: "Pay now", exact: true }).click();

  await expectOrderPage(page, orderId);
  await expect(orderStatus(page, "Confirmed")).toBeVisible();
  await expect(paymentHistory(page)).toContainText("2 attempts");
});

test("cancelling a payment keeps the order pending and allows another try", async ({
  page,
}) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  await startPayment(page, orderId);

  await page.getByRole("button", { name: "Cancel payment", exact: true }).click();

  await expectOrderPage(page, orderId);
  await expect(orderStatus(page, "Pending")).toBeVisible();
  await expect(paymentHistory(page)).toContainText("cancelled");
  await expect(page.getByRole("button", { name: "Pay now" })).toBeVisible();
});

test("leaving the payment page open keeps a way back to it", async ({ page }) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  const { paymentId } = await startPayment(page, orderId);

  await page.goto(`/account/orders/${orderId}`);

  await expect(
    page.getByRole("heading", { name: "Finish your demo payment" }),
  ).toBeVisible();
  await expect(paymentHistory(page)).toContainText("Paid with: Demo payment");
  await expect(orderStatus(page, "Pending")).toBeVisible();
  await page.getByRole("link", { name: "Continue demo payment" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/demo-pay/${paymentId}\\?order=${orderId}$`),
  );
  await expect(page.getByRole("button", { name: "Pay now", exact: true })).toBeVisible();
});
test("a double click on Pay now pays once", async ({ page }) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  await startPayment(page, orderId);

  await page.getByRole("button", { name: "Pay now", exact: true }).dblclick();

  await expectOrderPage(page, orderId);
  await expect(orderStatus(page, "Confirmed")).toBeVisible();
  await expect(paymentHistory(page)).toContainText("1 attempt");
  // (Next.js keeps its own route announcer outside <main>.)
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);
});

test("a finished payment shows that it is complete, with or without the order in the link", async ({
  page,
}) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  const { paymentId, href } = await startPayment(page, orderId);
  await page.getByRole("button", { name: "Pay now", exact: true }).click();
  await expectOrderPage(page, orderId);

  for (const path of [href, `/demo-pay/${paymentId}`]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "This payment is already complete" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);
    await page.getByRole("link", { name: "View order" }).click();
    await expectOrderPage(page, orderId);
  }
});

test("someone else's payment shows the same not-found message", async ({
  page,
  browser,
}) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  const { paymentId } = await startPayment(page, orderId);

  const stranger = await signedInContext(browser, OTHER_USER);
  const strangerPage = await stranger.newPage();
  try {
    for (const path of [
      `/demo-pay/${paymentId}?order=${orderId}`,
      `/demo-pay/${paymentId}`,
      `/demo-pay/987654?order=${orderId}`,
    ]) {
      await strangerPage.goto(path);
      await expect(
        strangerPage.getByRole("heading", { name: "Payment not found" }),
      ).toBeVisible();
      await expect(
        strangerPage.getByText("We could not find this payment in your account."),
      ).toBeVisible();
      await expect(strangerPage.getByRole("button", { name: "Pay now" })).toHaveCount(0);
      // Nothing about the owner's order leaks into the page.
      await expect(strangerPage.getByText(`#${orderId}`)).toHaveCount(0);
    }
  } finally {
    await stranger.close();
  }

  // The owner's payment was never touched.
  await page.goto(`/demo-pay/${paymentId}?order=${orderId}`);
  await expect(page.getByRole("button", { name: "Pay now", exact: true })).toBeVisible();
});

test("a signed-out visitor is sent to sign in and then back to the payment", async ({
  page,
  browser,
}) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  const { paymentId } = await startPayment(page, orderId);

  const visitor = await browser.newContext({ baseURL: BASE_URL });
  const visitorPage = await visitor.newPage();
  try {
    await visitorPage.goto(`/demo-pay/${paymentId}?order=${orderId}`);
    await expect(visitorPage).toHaveURL(/\/login\?next=%2Fdemo-pay%2F\d+%3Forder%3D\d+$/);
  } finally {
    await visitor.close();
  }
});

test("an order cancelled while the payment page is open can no longer be paid", async ({
  page,
  context,
}) => {
  await signedIn(page, CUSTOMER);
  const orderId = await placeOrder(page);
  await startPayment(page, orderId);

  // In another tab the shopper cancels the order.
  const otherTab = await context.newPage();
  await otherTab.goto(`/account/orders/${orderId}`);
  await otherTab.getByRole("button", { name: "Cancel Order" }).click();
  await otherTab.getByRole("button", { name: "Yes, cancel Order" }).click();
  await expect(orderStatus(otherTab, "Cancelled")).toBeVisible();

  // Back on the payment page, paying is refused with a plain message.
  await page.getByRole("button", { name: "Pay now", exact: true }).click();

  const message = page.getByRole("status").filter({
    hasText: "This order can no longer take this payment.",
  });
  await expect(message).toBeVisible();
  await expect(message).toContainText("Nothing was charged.");
  await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View order history" })).toHaveAttribute(
    "href",
    "/account/orders",
  );
  // No internal wording reaches the shopper.
  expect(findBannedTerms(await pageText(page))).toEqual([]);

  // The order stayed cancelled and was not paid.
  await page.goto(`/account/orders/${orderId}`);
  await expect(orderStatus(page, "Cancelled")).toBeVisible();
  await expect(paymentHistory(page)).not.toContainText("succeeded");
});

async function signedInContext(browser: Browser, email: string) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  await signedIn(page, email);
  await page.close();
  return context;
}

// The backend answers 100 /auth/me requests a minute per client, and the header
// asks it on every page. This spec loads roughly that many pages in under a
// minute; when the header is refused it quietly shows "Sign In", which would
// break the signed-in checks of whichever spec runs next. So the spec ends only
// once the minute that held its requests is over.
const WINDOW_MS = 60_000;
let startedAt = 0;

test.beforeAll(() => {
  startedAt = Date.now();
});

test.afterAll(async () => {
  test.setTimeout(WINDOW_MS + 10_000);
  const remaining = WINDOW_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
});