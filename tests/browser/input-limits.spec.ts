import { expect, test, type Page } from "@playwright/test";
import { apiAs, loginsPerformed, signInOnce } from "./support/cached-login";
import { CUSTOMER, OTHER_USER, skipProductPhotos } from "./support/shop";

// The backend refuses ids above 2147483647, prices above 1e12 and more than 99
// of one item per cart line. The pages must meet those limits first, with the
// app's own wording, never with the backend's text or an "unavailable" page.

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

const BACKEND_WORDING = /must not be greater|whole number|2147483647/i;

// What these pages show for an id that is not a page: the not-found page of
// their own section (account and admin orders, admin products and collections)
// or the app's default one (the checkout and demo payment pages, which have
// none of their own). The HTTP status is NOT asserted: the sections have a
// loading.tsx, so the server has already sent "200" with the loading shell
// when the page calls notFound(), and the not-found content then replaces it.
// What matters, and what is checked, is the page the visitor reads: the
// not-found heading, and none of the backend's wording.
const DEFAULT_NOT_FOUND = "This page could not be found.";

async function expectNotFound(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(
    page.getByText(heading, { exact: true }).first(),
    `${path} shows "${heading}"`,
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(BACKEND_WORDING);
  await expect(page.getByText("Order unavailable")).toHaveCount(0);
}

test.afterAll(() => {
  // How close this file came to the limit of 20 logins a minute per email.
  console.log(`input-limits logins so far: ${JSON.stringify(loginsPerformed())}`);
});

test.describe("ids from an address", () => {
  const BAD_IDS = ["2147483648", "99999999999", "1.5", "0", "abc"];

  test("an out-of-range or invalid order id shows the not-found page", async ({
    page,
  }) => {
    await signInOnce(page, CUSTOMER);

    for (const id of BAD_IDS) {
      await expectNotFound(page, `/account/orders/${id}`, "Order not found");
      await expectNotFound(page, `/checkout/success/${id}`, DEFAULT_NOT_FOUND);
      await expectNotFound(page, `/demo-pay/${id}`, DEFAULT_NOT_FOUND);
    }
  });

  test("the same for the admin order, product and collection pages", async ({
    page,
  }) => {
    await signInOnce(page, OTHER_USER);

    for (const id of BAD_IDS) {
      await expectNotFound(page, `/admin/orders/${id}`, "Order not found");
      await expectNotFound(page, `/admin/products/${id}`, "Product not found");
      await expectNotFound(
        page,
        `/admin/collections/${id}`,
        "Collection not found",
      );
    }
  });

  test("the largest valid id is still looked up, and is an ordinary not-found order", async ({
    page,
  }) => {
    await signInOnce(page, CUSTOMER);

    // Within range, so it reaches the backend, which has no such order.
    await expectNotFound(page, "/account/orders/2147483647", "Order not found");
  });
});

test.describe("the price filter", () => {
  test("a price above the limit is ignored with a note, and the products still show", async ({
    page,
  }) => {
    await page.goto("/products?minPrice=2000000000000");

    await expect(page.getByText("Price filter ignored.")).toBeVisible();
    await expect(page.getByText("Products temporarily unavailable")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
    await expect(page.getByText("No products match these filters")).toHaveCount(0);
  });

  test("text instead of a price is ignored the same way", async ({ page }) => {
    await page.goto("/products?maxPrice=abc");

    await expect(page.getByText("Price filter ignored.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible();
  });

  test("a price within the limit is used and has no note", async ({ page }) => {
    await page.goto("/products?maxPrice=100000000");

    await expect(page.getByText("Price filter ignored.")).toHaveCount(0);
    await expect(page.getByText("Products temporarily unavailable")).toHaveCount(0);
  });

  test("the price boxes stop at the limit", async ({ page }) => {
    await page.goto("/products");

    const min = page.getByLabel("Minimum price in VND").first();
    const max = page.getByLabel("Maximum price in VND").first();
    await expect(min).toHaveAttribute("max", "1000000000000");
    await expect(max).toHaveAttribute("max", "1000000000000");
  });
});

// The seeded variants hold fewer than 99, so the stock is the cap here; the
// 99-per-line cap and the 50-line rule are covered by the unit tests
// (tests/unit/quantity-limits.spec.ts).
test.describe("quantity", () => {
  // The cart is only emptied here (it holds no stock), before and after.
  async function clearCart(page: Page) {
    await apiAs(page.request, CUSTOMER, "DELETE", "/cart");
  }

  test("the selector stops at the stock, and so does the + of the cart", async ({
    page,
  }) => {
    await signInOnce(page, CUSTOMER);
    await clearCart(page);
    try {
      await page.goto("/products/cushioned-cotton-crew-socks-3-pack");
      await page.waitForLoadState("networkidle");
      const sizes = page.locator(
        '[aria-label="Available sizes"] button:not([disabled]):not([aria-disabled="true"])',
      );
      if (await sizes.count()) await sizes.first().click();

      const quantity = page.locator("#quantity-input");
      const max = Number(await quantity.getAttribute("max"));
      expect(max, "the selector's maximum").toBeGreaterThan(1);
      expect(max, "never above 99").toBeLessThanOrEqual(99);

      await quantity.fill("500");
      await expect(quantity).toHaveValue(String(max));
      await expect(
        page.getByRole("button", { name: "Increase quantity" }),
      ).toBeDisabled();

      await page.getByRole("button", { name: "Add to Bag" }).first().click();
      await expect(page.getByText("Added to your cart.")).toBeVisible();

      await page.goto("/cart");
      await expect(page.locator("output").first()).toHaveText(String(max));
      const plus = page.getByRole("button", { name: "Increase cart quantity" });
      await expect(plus).toBeDisabled();
      await expect(page.getByText("That is all we have in stock.")).toBeVisible();
      const noteId = await plus.getAttribute("aria-describedby");
      expect(noteId, "the + button points at its explanation").toBeTruthy();
      await expect(page.locator(`[id="${noteId}"]`)).toHaveText(
        "That is all we have in stock.",
      );
      // Going down is still possible.
      await expect(
        page.getByRole("button", { name: "Decrease cart quantity" }),
      ).toBeEnabled();
    } finally {
      await clearCart(page);
    }
  });
});
