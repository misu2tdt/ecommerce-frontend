import { expect, test, type Page } from "@playwright/test";
import { API_URL, skipProductPhotos } from "./support/shop";

// The product page against the real seeded backend: the gallery follows the
// chosen colour, a size must be chosen (asked for inline, never with an alert),
// sold-out sizes cannot be picked, a sticky bar on phones, related products and
// the data search engines read.

const TEE = "classic-crewneck-cotton-tee";

interface ApiProduct {
  name: string;
  slug: string;
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{ stock: number; attributes: Record<string, string> }>;
  category: { slug: string; name: string };
}

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
  // A browser alert would be a failure of the inline message.
  page.on("dialog", (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`);
  });
});

async function apiProduct(
  request: Parameters<Parameters<typeof test>[2]>[0]["request"],
  slug: string,
) {
  return (await (await request.get(`${API_URL}/products/slug/${slug}`)).json()) as ApiProduct;
}

const addToBag = (page: Page) =>
  page.getByRole("button", { name: "Add to Bag" }).first();
// The colour choices (the photo thumbnails are named after colours too).
const colorButton = (page: Page, color: string) =>
  page.locator('[aria-label="Available colors"] button').filter({ hasText: color }).first();
const sizeButtons = (page: Page) =>
  page.locator('[aria-label="Available sizes"] button');

test.describe("the gallery", () => {
  test("choosing a colour shows that colour's photo", async ({ page, request }) => {
    const product = await apiProduct(request, TEE);
    test.skip(
      product.images.length < 2,
      "The test database has no product photos (seed it with DEMO_SEED_TEST_IMAGES=true).",
    );
    await page.goto(`/products/${TEE}`);
    const main = page.locator('section[aria-label$="gallery"] img').first();

    await colorButton(page, "White").click();
    await expect(main).toHaveAttribute("alt", /in White$/);
    await colorButton(page, "Black").click();
    await expect(main).toHaveAttribute("alt", /in Black$/);
  });

  test("the thumbnails are buttons with their own text and work from the keyboard", async ({
    page,
    request,
  }) => {
    const product = await apiProduct(request, TEE);
    test.skip(product.images.length < 2, "The test database has no product photos.");
    await page.goto(`/products/${TEE}`);

    const thumbs = page.locator('[aria-label="Gallery thumbnails"] button');
    await expect(thumbs).toHaveCount(product.images.length);
    for (const [index, image] of product.images.entries()) {
      await expect(thumbs.nth(index)).toHaveAttribute(
        "aria-label",
        `View ${image.altText}`,
      );
    }
    await page.waitForLoadState("networkidle");
    await thumbs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(thumbs.nth(1)).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("choosing a size", () => {
  test("asks for a size inline when Add to Bag is pressed without one", async ({ page }) => {
    await page.goto(`/products/${TEE}`);

    await addToBag(page).click();

    const message = page.getByRole("alert").filter({ hasText: "Please choose a size." });
    await expect(message).toBeVisible();
    // Focus goes to the sizes, which are linked to the message.
    await expect(page.locator('[aria-label="Available sizes"]')).toBeFocused();
    await expect(page.locator('[aria-label="Available sizes"]')).toHaveAttribute(
      "aria-describedby",
      "selection-error",
    );
    await expect(page.getByText("Added to your cart.")).toHaveCount(0);

    await sizeButtons(page).first().click();
    await expect(message).toHaveCount(0);
  });

  test("a size that is sold out is struck through, marked aria-disabled and cannot be picked", async ({
    page,
    request,
  }) => {
    const list = (await (await request.get(`${API_URL}/products`)).json()) as ApiProduct[];
    let found: { slug: string; color?: string; size?: string } | null = null;
    for (const { slug } of list) {
      const detail = await apiProduct(request, slug);
      const soldOut = detail.variants.find((variant) => variant.stock === 0 && variant.attributes.size);
      if (soldOut) {
        found = { slug, color: soldOut.attributes.color, size: soldOut.attributes.size };
        break;
      }
    }
    expect(found, "the seed has sold-out variants").not.toBeNull();

    await page.goto(`/products/${found!.slug}`);
    if (found!.color) {
      await colorButton(page, found!.color).click();
    }
    const size = sizeButtons(page).filter({ hasText: new RegExp(`^${found!.size}`) }).first();

    await expect(size).toHaveAttribute("aria-disabled", "true");
    await expect(size).toContainText("Sold out");
    expect(
      await size.evaluate((element) => getComputedStyle(element).textDecorationLine),
    ).toContain("line-through");
    // Playwright treats aria-disabled as disabled, so the click is forced: a real
    // visitor can still try, and nothing may happen.
    await size.click({ force: true });
    await expect(size).toHaveAttribute("aria-pressed", "false");
    expect((await size.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("every size is a 44px target, and the stock hint only shows for a few left", async ({
    page,
  }) => {
    await page.goto(`/products/${TEE}`);
    await expect(sizeButtons(page).first()).toBeVisible();
    for (const button of await sizeButtons(page).all()) {
      await expect(button).toBeVisible();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await sizeButtons(page).first().click();
    // 25 are in stock: no number is shown.
    await expect(page.getByText(/\d+ in stock/)).toHaveCount(0);
    await expect(page.getByText(/Only \d+ left/)).toHaveCount(0);
  });

  test("opens an approximate size guide and closes it with Escape", async ({ page }) => {
    await page.goto(`/products/${TEE}`);
    await page.getByRole("button", { name: "Size & fit guide" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Approximate guide");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("the sticky bar on phones", () => {
  test.use({ viewport: { width: 390, height: 700 } });
  const bar = (page: Page) => page.locator("div.fixed.bottom-0");

  test("appears once the main button has scrolled away, and not over the footer", async ({
    page,
  }) => {
    await page.goto(`/products/${TEE}`);
    await page.waitForLoadState("networkidle");

    // At the top the main button is far below: nothing yet, or already there is
    // the bar? It is shown only when the main button is off screen.
    const mainButton = addToBag(page);
    const visibleAtTop = await mainButton.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.top < window.innerHeight && box.bottom > 0;
    });
    expect(await bar(page).count()).toBe(visibleAtTop ? 0 : 1);

    await mainButton.scrollIntoViewIfNeeded();
    await expect(bar(page)).toHaveCount(0);

    // Scroll past it.
    await page.evaluate(() => window.scrollBy(0, 900));
    await expect(bar(page)).toBeVisible();
    await expect(bar(page).getByRole("button", { name: "Add to Bag" })).toBeVisible();

    // At the very bottom the footer is on screen and the bar steps aside.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(bar(page)).toHaveCount(0);
    await expect(page.locator("footer")).toBeInViewport();
  });

  test("pressing it without a size asks for one and does not add anything", async ({ page }) => {
    await page.goto(`/products/${TEE}`);
    // Just past the main button, not so far that the footer comes into view.
    await addToBag(page).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 900));
    await expect(bar(page)).toBeVisible();

    await bar(page).getByRole("button", { name: "Add to Bag" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Please choose a size." })).toBeVisible();
    await expect(page.getByText("Added to your cart.")).toHaveCount(0);
  });
});

test.describe("around the product", () => {
  test("the breadcrumb runs Home, category, product, and marks the current page", async ({
    page,
    request,
  }) => {
    const product = await apiProduct(request, TEE);
    await page.goto(`/products/${TEE}`);

    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link")).toHaveText(["Home", product.category.name]);
    await expect(crumbs.getByRole("link").first()).toHaveAttribute("href", "/");
    await expect(crumbs.getByRole("link").nth(1)).toHaveAttribute(
      "href",
      `/products?category=${product.category.slug}`,
    );
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText(product.name);
  });

  test("shows up to four other products of the same category", async ({ page, request }) => {
    const product = await apiProduct(request, TEE);
    await page.goto(`/products/${TEE}`);

    const related = page.locator("section[aria-labelledby='related-products-heading']");
    await expect(related.getByRole("heading", { level: 2 })).toHaveText(
      `More in ${product.category.name}`,
    );
    const links = await related
      .locator('a[href^="/products/"]')
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")!.split("?")[0]));
    const slugs = [...new Set(links)];
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.length).toBeLessThanOrEqual(4);
    expect(slugs).not.toContain(`/products/${TEE}`);
  });

  test("carries valid product data for search engines, with no invented fields", async ({
    page,
    request,
  }) => {
    const product = await apiProduct(request, TEE);
    await page.goto(`/products/${TEE}`);

    const texts = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => script.textContent ?? ""));
    expect(texts).toHaveLength(1);
    const data = JSON.parse(texts[0]) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe(product.name);
    expect(data.offers.priceCurrency).toBe("VND");
    expect(data.offers.availability).toBe(
      product.variants.some((variant) => variant.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    );
    for (const invented of ["aggregateRating", "review", "sku", "gtin"]) {
      expect(Object.keys(data)).not.toContain(invented);
    }
    if (product.images.length > 0) {
      expect(data.image).toEqual(product.images.map((image) => image.url));
    }
  });
});
