import { expect, test, type Page } from "@playwright/test";
import {
  addSocksToCart,
  apiGet,
  CUSTOMER,
  OTHER_USER,
  orderStatus,
  paymentHistory,
  placeOrder,
  signIn,
  skipProductPhotos,
  startPayment,
  vietnamParts,
} from "./support/shop";

// The pages around placing an order, against the real seeded backend (demo
// payment provider): what the page after checkout says, the words customers read
// for a status, dates in Vietnam time, and money shown without a currency code.

interface BackendOrder {
  id: number;
  status: string;
  createdAt: string;
  paymentExpiresAt: string | null;
}

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

const successPath = (orderId: number) => `/checkout/success/${orderId}`;

async function backendOrder(
  request: Parameters<typeof apiGet>[0],
  orderId: number,
) {
  return apiGet<BackendOrder>(request, CUSTOMER, `/orders/${orderId}`);
}

test.describe("the page after placing an order", () => {
  test("asks for payment, with the backend's deadline in Vietnam time", async ({
    page,
    request,
  }) => {
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);
    const order = await backendOrder(request, orderId);
    expect(order.paymentExpiresAt, "a pending order has a deadline").not.toBeNull();

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Complete your payment");
    await expect(page.getByText("Order placed", { exact: true })).toBeVisible();
    // Nothing on the page says the purchase is finished.
    await expect(page.getByText("Thank you for your order")).toHaveCount(0);
    await expect(page.getByText("✓")).toHaveCount(0);

    // The deadline is the backend's, written as an absolute Vietnam time.
    const { date, time } = vietnamParts(order.paymentExpiresAt!);
    const main = page.locator("main");
    await expect(main).toContainText(
      `by ${date}, ${time} (Vietnam time), or it is cancelled and the items go back in stock`,
    );
    // The deadline follows the window the backend uses, so it is not a number
    // written into the page: it is later than the order's own creation time.
    expect(new Date(order.paymentExpiresAt!).getTime()).toBeGreaterThan(
      new Date(order.createdAt).getTime(),
    );

    // The primary action is the payment button; View Order is the secondary one.
    const pay = page.getByRole("button", { name: "Pay now" });
    const view = page.getByRole("link", { name: "View Order" });
    await expect(pay).toBeVisible();
    await expect(view).toHaveAttribute("href", `/account/orders/${orderId}`);
    expect(
      (await pay.boundingBox())!.y,
      "the payment button comes before View Order",
    ).toBeLessThan((await view.boundingBox())!.y);

    await expect(orderStatus(page, "Awaiting payment")).toBeVisible();
  });

  test("paying from it ends with a confirmed order and no payment prompt", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);

    await page.getByRole("button", { name: "Pay now" }).click();
    await page.waitForURL(/\/demo-pay\/\d+/);
    await page.getByRole("button", { name: "Pay now", exact: true }).click();
    await page.waitForURL(new RegExp(`/account/orders/${orderId}$`));

    await expect(orderStatus(page, "Confirmed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);

    // Going back to the page after checkout now thanks the shopper instead.
    await page.goto(successPath(orderId));
    await expect(page.locator("h1")).toHaveText("Thank you for your order");
    await expect(orderStatus(page, "Confirmed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);
    await expect(page.getByText("Complete your payment")).toHaveCount(0);
  });

  test("a payment that was started but not finished is picked up again", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);
    await page.getByRole("button", { name: "Pay now" }).click();
    await page.waitForURL(/\/demo-pay\/\d+/);

    await page.goto(successPath(orderId));

    await expect(page.locator("h1")).toHaveText("Complete your payment");
    await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Continue demo payment" }),
    ).toBeVisible();
  });

  test("a cancelled order is explained neutrally, with a way back to order history", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);
    await page.goto(`/account/orders/${orderId}`);
    await page.getByRole("button", { name: "Cancel Order" }).click();
    await page.getByRole("button", { name: "Yes, cancel Order" }).click();
    await expect(orderStatus(page, "Cancelled")).toBeVisible();

    await page.goto(successPath(orderId));

    await expect(page.locator("h1")).toHaveText("This order is no longer open");
    await expect(page.getByText("Thank you for your order")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pay now" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "View order history" }),
    ).toHaveAttribute("href", "/account/orders");
  });
});

test.describe("status words, dates and money", () => {
  async function orderWithPayment(page: Page) {
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);
    await startPayment(page, orderId);
    await page.getByRole("button", { name: "Simulate a failed payment" }).click();
    await page.waitForURL(new RegExp(`/account/orders/${orderId}$`));
    return orderId;
  }

  test("customers read 'Awaiting payment', admins keep 'Pending'", async ({
    page,
    browser,
  }) => {
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);

    await page.goto(`/account/orders/${orderId}`);
    await expect(orderStatus(page, "Awaiting payment")).toBeVisible();
    await expect(page.getByText("Order status", { exact: true })).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toHaveCount(0);

    await page.goto("/account/orders");
    await expect(
      page.locator(`a[href="/account/orders/${orderId}"]`).first(),
    ).toBeVisible();
    await expect(orderStatus(page, "Awaiting payment")).toBeVisible();

    const admin = await browser.newContext({ baseURL: "http://localhost:3001" });
    const adminPage = await admin.newPage();
    try {
      await signIn(adminPage, OTHER_USER, "/account");
      await adminPage.goto(`/admin/orders/${orderId}`);
      await expect(orderStatus(adminPage, "Pending")).toBeVisible();
      await expect(
        adminPage.locator('[aria-label="Order status: Awaiting payment"]'),
      ).toHaveCount(0);
    } finally {
      await admin.close();
    }
  });

  test("dates are in Vietnam time", async ({ page, request }) => {
    await signIn(page, CUSTOMER);
    const orderId = await orderWithPayment(page);
    const order = await backendOrder(request, orderId);
    const { date, time } = vietnamParts(order.createdAt);

    await page.goto(`/account/orders/${orderId}`);
    await expect(page.locator("main")).toContainText(`Placed ${date}, ${time}`);
    await expect(paymentHistory(page)).toContainText(date);

    await page.goto("/account/orders");
    await expect(page.locator("main")).toContainText(`Placed ${date}, ${time}`);
  });

  test("money shows the symbol only, and the cart has no label that counts nothing", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    const orderId = await orderWithPayment(page);

    await page.goto(`/account/orders/${orderId}`);
    const amount = paymentHistory(page).getByText(/\d\s₫/).first();
    await expect(amount).toBeVisible();
    await expect(paymentHistory(page)).not.toContainText("VND");
    expect((await amount.innerText()).trim()).toMatch(/^\d{1,3}(\.\d{3})*\s₫$/);

    await addSocksToCart(page);
    await page.goto("/cart");
    await expect(page.getByText("Cart summary")).toBeVisible();
    await expect(page.getByText("Eligible items")).toHaveCount(0);
    await expect(page.locator("aside").getByText(/^\d+ items?$/)).toBeVisible();
  });
});
