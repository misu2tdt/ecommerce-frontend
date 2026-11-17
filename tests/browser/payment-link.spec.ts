import {
  expect,
  request as playwrightRequest,
  test,
  type Page,
} from "@playwright/test";
import { apiAs, loginsPerformed, signInOnce } from "./support/cached-login";
import { CUSTOMER, placeOrder, skipProductPhotos } from "./support/shop";

// The pay button ("Continue to MoMo") must follow the payment status, not only
// the presence of a checkout link. The backend gives no link for a cancelled,
// failed or finished payment, but the page must not rely on that, so these tests
// answer the "Pay now" server action with a payment of each status that CARRIES
// a link, and check what the page offers. (The real backend uses the demo
// provider in this suite, which has no checkout link at all.)

const LINK = "https://test-payment.momo.vn/pay/practice-link";

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

function payment(status: string, checkoutUrl?: string) {
  return {
    id: 9001,
    provider: "momo",
    amount: 400000,
    currency: "VND",
    status,
    createdAt: "2026-08-15T08:00:00.000Z",
    updatedAt: "2026-08-15T08:00:05.000Z",
    succeededAt: status === "succeeded" ? "2026-08-15T08:00:05.000Z" : null,
    ...(checkoutUrl ? { checkoutUrl } : {}),
  };
}

// Answers the next "Pay now" server action with `state` as the action result.
// The response is the real one for an order that is not found (so the framing
// and build id are the app's own), with its result line replaced. The form is
// sent with order 0 so that no payment is created on the backend.
async function answerPayNowWith(page: Page, state: unknown) {
  await page.route("**/checkout/success/*", async (route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.headers()["next-action"]) {
      return route.fallback();
    }
    const real = await route.fetch();
    const lines = (await real.text()).split("\n");
    const resultAt = lines.findIndex((line) => line.startsWith("1:"));
    expect(resultAt, "the action response has a result line").toBeGreaterThan(0);
    lines[resultAt] = `1:${JSON.stringify(state)}`;
    await route.fulfill({
      status: 200,
      contentType: "text/x-component",
      body: lines.join("\n"),
    });
  });
  await page
    .locator('input[name="orderId"]')
    .evaluate((input) => ((input as HTMLInputElement).value = "0"));
  await page.getByRole("button", { name: "Pay now" }).click();
}

const noPayButton = async (page: Page) => {
  await expect(
    page.getByRole("link", { name: "Continue to MoMo" }),
  ).toHaveCount(0);
  await expect(page.locator('a[href*="momo"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);
};

test.describe("the pay button follows the payment status", () => {
  // One order for the whole file, placed by the first test and cancelled at
  // the end. Every test only needs a pending order's page, because the server
  // action is answered in the browser (no payment is created), so there is no
  // reason to place one per test: an order holds one unit of stock until it is
  // paid or cancelled, and the seeded socks have only 50 for the whole suite
  // (the sold-out test of product-page.spec.ts needs some of them left).
  // The customer signs in once per run (see support/cached-login.ts).
  let orderId = 0;
  test.beforeEach(async ({ page }) => {
    await signInOnce(page, CUSTOMER);
    if (orderId === 0) {
      orderId = await placeOrder(page);
    } else {
      await page.goto(`/checkout/success/${orderId}`);
    }
  });

  test.afterAll(async () => {
    if (orderId !== 0) {
      // Gives the unit of stock back now, not at the end of the run.
      const api = await playwrightRequest.newContext();
      try {
        await apiAs(api, CUSTOMER, "POST", `/orders/${orderId}/cancel`);
      } finally {
        await api.dispose();
      }
    }
    console.log(`payment-link logins so far: ${JSON.stringify(loginsPerformed())}`);
  });

  test("a cancelled payment that carries a link has no pay button, and a way to try again", async ({
    page,
  }) => {
    await answerPayNowWith(page, {
      status: "success",
      payment: payment("cancelled", LINK),
      checkoutUrl: LINK,
      message: "Payment started. Continue to MoMo to complete it.",
    });

    await expect(
      page.getByText("This payment was cancelled or has expired."),
    ).toBeVisible();
    // The old "started" message from the action is not shown for this payment.
    await expect(page.getByText("Payment started. Continue to MoMo")).toHaveCount(0);
    await noPayButton(page);

    // The order is still payable, so going back to it offers a new payment.
    await page.unroute("**/checkout/success/*");
    await page.getByRole("link", { name: "Back to the order to try again" }).click();
    await page.waitForURL(new RegExp(`/account/orders/${orderId}$`));
    await expect(page.getByRole("button", { name: "Pay now" })).toBeVisible();
  });

  for (const [status, message, retry] of [
    ["failed", "This payment did not go through.", true],
    ["succeeded", "This payment is already confirmed.", false],
    ["pending", "Your payment is still being set up.", false],
  ] as const) {
    test(`a ${status} payment that carries a link has no pay button`, async ({
      page,
    }) => {
      await answerPayNowWith(page, {
        status: "success",
        payment: payment(status, LINK),
        checkoutUrl: LINK,
        message: "Payment started. Continue to MoMo to complete it.",
      });

      await expect(page.getByText(message, { exact: false })).toBeVisible();
      await noPayButton(page);
      await expect(
        page.getByRole("link", {
          name: retry ? "Back to the order to try again" : "Check payment status",
        }),
      ).toHaveAttribute("href", `/account/orders/${orderId}`);
    });
  }

  test("a processing payment without a link has no pay button", async ({
    page,
  }) => {
    await answerPayNowWith(page, {
      status: "success",
      payment: payment("processing"),
      message: "We started your payment but could not open the MoMo page.",
    });

    await expect(page.getByText("could not open the MoMo page")).toBeVisible();
    await noPayButton(page);
    await expect(
      page.getByRole("link", { name: "Check payment status" }),
    ).toBeVisible();
  });

  test("a processing payment with a link gets the pay button", async ({
    page,
  }) => {
    await answerPayNowWith(page, {
      status: "success",
      payment: payment("processing", LINK),
      checkoutUrl: LINK,
      message: "Payment started. Continue to MoMo to complete it.",
    });

    await expect(
      page.getByRole("link", { name: "Continue to MoMo" }),
    ).toHaveAttribute("href", LINK);
  });

  test("a processing payment whose link is not an http address has no pay button", async ({
    page,
  }) => {
    await answerPayNowWith(page, {
      status: "success",
      payment: payment("processing", "javascript:alert(1)"),
      checkoutUrl: "javascript:alert(1)",
      message: "Payment started. Continue to MoMo to complete it.",
    });

    await expect(page.getByText("We could not open the MoMo payment page")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to MoMo" }),
    ).toHaveCount(0);
  });
});
