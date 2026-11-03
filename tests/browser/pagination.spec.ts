import { expect, test, type Page } from "@playwright/test";
import {
  apiGet,
  createOrdersViaApi,
  CUSTOMER,
  OTHER_USER,
  placeOrder,
  signIn,
  skipProductPhotos,
} from "./support/shop";

// Paging against the real seeded backend (26 products, so three catalog pages of
// 12, 12 and 2). The pager keeps the filters and the sort in the address, a page
// that is not a real page goes to one that is, and focus follows the visitor.

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

const pager = (page: Page) => page.getByRole("navigation", { name: "Pagination" });

// The product pages linked from the grid, one entry per card.
async function productSlugs(page: Page): Promise<string[]> {
  await page.locator('main a[href^="/products/"]').first().waitFor();
  const hrefs = await page
    .locator('main a[href^="/products/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  return [...new Set(hrefs.map((href) => href.split("?")[0]))];
}

test.describe("the catalog", () => {
  test("shows 12 products a page with an accessible pager", async ({ page }) => {
    await page.goto("/products");

    expect(await productSlugs(page)).toHaveLength(12);
    await expect(page.getByRole("status").filter({ hasText: "Showing 1–12 of 26" })).toBeVisible();
    await expect(pager(page)).toBeVisible();
    await expect(pager(page).locator('[aria-current="page"]')).toHaveText("1");
    // The first page cannot go back; the pager says so instead of linking.
    await expect(pager(page).getByText("Previous")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(pager(page).getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/products?page=2",
    );
    await expect(pager(page).getByRole("link", { name: "Page 3" })).toHaveAttribute(
      "href",
      "/products?page=3",
    );
  });

  test("walks through every product exactly once, and the first page has one address", async ({
    page,
  }) => {
    await page.goto("/products");
    const seen = [...(await productSlugs(page))];

    await pager(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL(/\/products\?page=2$/);
    await expect(pager(page).locator('[aria-current="page"]')).toHaveText("2");
    seen.push(...(await productSlugs(page)));

    await pager(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL(/\/products\?page=3$/);
    const last = await productSlugs(page);
    expect(last).toHaveLength(2);
    seen.push(...last);
    await expect(pager(page).getByText("Next")).toHaveAttribute("aria-disabled", "true");

    expect(seen).toHaveLength(26);
    expect(new Set(seen).size, "no product repeats across pages").toBe(26);

    await pager(page).getByRole("link", { name: "Page 1" }).click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test("keeps the filters and the sort in the address while paging", async ({ page }) => {
    await page.goto("/products?inStock=true&sort=name_desc");
    const next = pager(page).getByRole("link", { name: "Next page" });
    await expect(next).toHaveAttribute("href", "/products?inStock=true&sort=name_desc&page=2");

    const firstPage = await productSlugs(page);
    await next.click();
    await expect(page).toHaveURL(/inStock=true&sort=name_desc&page=2$/);
    expect(await productSlugs(page)).not.toEqual(firstPage);

    // Changing the sort starts again from the first page.
    await page.getByLabel(/sort/i).first().selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page).not.toHaveURL(/page=/);
  });

  test("sends a page that is not a real page to one that is", async ({ page }) => {
    for (const [from, to] of [
      ["/products?page=abc", "/products"],
      ["/products?page=0", "/products"],
      ["/products?page=-3", "/products"],
      ["/products?page=1.5", "/products"],
      ["/products?page=", "/products"],
      ["/products?page=999", "/products?page=3"],
      ["/products?page=99999999999", "/products"],
      ["/products?sort=price_asc&page=999", "/products?sort=price_asc&page=3"],
      // The filter leaves a single page, so page 2 does not exist.
      ["/products?category=t-shirts-tops&page=2", "/products?category=t-shirts-tops"],
    ] as const) {
      const response = await page.goto(from);
      expect(response!.status(), from).toBe(200);
      await expect(page, from).toHaveURL(`http://localhost:3001${to}`);
      await expect(page.locator("h1")).toHaveCount(1);
    }
  });

  test("moves focus to the results after a page change, but not on the first load", async ({
    page,
  }) => {
    await page.goto("/products");
    expect(await page.evaluate(() => document.activeElement?.id ?? "")).not.toBe(
      "catalog-results",
    );

    await pager(page).getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2$/);

    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id))
      .toBe("catalog-results");
    const box = await page.locator("#catalog-results").boundingBox();
    expect(box!.y, "the results start inside the screen").toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(400);
  });

  test("fits a phone: big tap targets, a short pager and no sideways scroll", async ({
    page,
  }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/products?page=2");

      const small = await pager(page).evaluate((nav, minimum) => {
        return [...nav.querySelectorAll("a, [aria-disabled]")]
          .filter((element) => (element as HTMLElement).checkVisibility())
          .map((element) => ({
            text: (element.textContent ?? "").trim(),
            height: element.getBoundingClientRect().height,
          }))
          .filter((item) => item.height < minimum - 0.5);
      }, 44);
      expect(small, `${width}px`).toEqual([]);
      await expect(pager(page).getByText("Page 2 of 3")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
});

test.describe("order history and the admin lists", () => {
  // 22 orders for the account at least (1 placed in the UI, 21 through the API), so the 20 a page gives two pages.
  test.beforeAll(async ({ browser, playwright }) => {
    const context = await browser.newContext({ baseURL: "http://localhost:3001" });
    const page = await context.newPage();
    await signIn(page, CUSTOMER);
    await placeOrder(page);
    await context.close();
    const request = await playwright.request.newContext();
    await createOrdersViaApi(request, CUSTOMER, 21);
    await request.dispose();
  });

  test("the customer's order history is paged, newest first", async ({ page, request }) => {
    const all = await apiGet<Array<{ id: number }>>(request, CUSTOMER, "/orders");
    expect(all.length).toBeGreaterThan(20);
    const totalPages = Math.ceil(all.length / 20);

    await signIn(page, CUSTOMER);
    await page.goto("/account/orders");
    await expect(page.locator("main article")).toHaveCount(20);
    await expect(page.locator("main article h2").first()).toHaveText(
      `Order #${all[0].id}`,
    );
    await expect(
      page.getByRole("navigation", { name: "Order history pages" }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: `Showing 1–20 of ${all.length}` }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Order history pages" })
      .getByRole("link", { name: "Next page" })
      .click();
    await expect(page).toHaveURL(/\/account\/orders\?page=2$/);
    await expect(page.locator("main article h2").first()).toHaveText(
      `Order #${all[20].id}`,
    );

    // Not a real page: back to a real one.
    await page.goto("/account/orders?page=abc");
    await expect(page).toHaveURL(/\/account\/orders$/);
    await page.goto("/account/orders?page=99999");
    await expect(page).toHaveURL(
      new RegExp(`/account/orders${totalPages > 1 ? `\\?page=${totalPages}` : ""}$`),
    );
  });

  test("the admin order and product lists are paged too", async ({ page }) => {
    await signIn(page, OTHER_USER);

    await page.goto("/admin/orders");
    await expect(page.locator("main tbody tr")).toHaveCount(20);
    await expect(
      page.getByRole("navigation", { name: "Orders pages" }),
    ).toBeVisible();
    await page.goto("/admin/orders?page=zzz");
    await expect(page).toHaveURL(/\/admin\/orders$/);

    await page.goto("/admin/products");
    await expect(page.locator("main tbody tr")).toHaveCount(20);
    await page
      .getByRole("navigation", { name: "Products pages" })
      .getByRole("link", { name: "Next page" })
      .click();
    await expect(page).toHaveURL(/\/admin\/products\?page=2$/);
    await expect(page.locator("main tbody tr")).toHaveCount(6);
    await page.goto("/admin/products?page=50");
    await expect(page).toHaveURL(/\/admin\/products\?page=2$/);

    // Few enough rows for one page: no pager.
    await page.goto("/admin/promotions");
    await expect(page.getByRole("navigation", { name: "Coupons pages" })).toHaveCount(0);
  });
});
