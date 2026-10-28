import { expect, test, type Page } from "@playwright/test";

// Browser checks for the product card: a photo-first 4:5 card with one link,
// an icon-only wishlist heart, a truthful price and no stock/review filler.
// The browser tests run on the image-free test seed, so the placeholder path
// is what gets exercised here; that is expected.

const DEMO_PASSWORD = "DemoOnly!2026";
// Seeded with compare-at 249.000 and price 199.000 on every variant: -20%.
const DISCOUNTED_PRODUCT = "Classic Crewneck Cotton Tee";

async function openCatalog(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/products");
  await expect(page.locator("main article").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

// How many cards sit on the first row, by comparing their top edges.
async function cardsInFirstRow(page: Page) {
  return page.evaluate(() => {
    const tops = Array.from(document.querySelectorAll("main article")).map(
      (card) => Math.round(card.getBoundingClientRect().top),
    );
    return tops.filter((top) => top === tops[0]).length;
  });
}

test("catalog shows 2 cards per row on a phone and 4 on a wide screen", async ({
  page,
}) => {
  await openCatalog(page, 390);
  expect(await cardsInFirstRow(page)).toBe(2);

  await openCatalog(page, 1440);
  expect(await cardsInFirstRow(page)).toBe(4);
});

test("card images are portrait 4:5 boxes", async ({ page }) => {
  for (const width of [390, 1440]) {
    await openCatalog(page, width);
    const ratios = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main article")).map((card) => {
        const box = card.firstElementChild!.getBoundingClientRect();
        return box.width / box.height;
      }),
    );
    expect(ratios.length).toBeGreaterThan(4);
    for (const ratio of ratios) {
      expect(ratio, `image box ratio at ${width}px`).toBeGreaterThan(0.78);
      expect(ratio, `image box ratio at ${width}px`).toBeLessThan(0.82);
    }
  }
});

test("cards no longer show the stock or empty-review filler", async ({
  page,
}) => {
  await openCatalog(page, 1440);
  const text = await page.locator("main article").allInnerTexts();

  expect(text.length).toBeGreaterThan(4);
  for (const card of text) {
    expect(card).not.toContain("In stock");
    expect(card).not.toContain("No reviews yet");
    expect(card).not.toContain("Sale options");
  }
});

test("each card has one link and one wishlist heart that is a 44px target", async ({
  page,
}) => {
  await openCatalog(page, 390);
  const cards = page.locator("main article");
  const count = await cards.count();
  expect(count).toBeGreaterThan(4);

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    await expect(card.getByRole("link")).toHaveCount(1);
    await expect(card.getByRole("button")).toHaveCount(1);

    const heart = card.getByRole("button", { name: /wishlist/i });
    await expect(heart).toHaveCount(1);
    const box = await heart.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("the title link is stretched over the whole card", async ({ page }) => {
  await openCatalog(page, 1440);
  const card = page.locator("main article").first();
  const cardBox = (await card.boundingBox())!;
  const link = card.getByRole("link");
  const href = await link.getAttribute("href");

  // A click in the middle of the image area, far from the title, follows the link.
  await page.mouse.click(cardBox.x + cardBox.width / 2, cardBox.y + 40);
  await expect(page).toHaveURL(new RegExp(`${href!.split("?")[0]}`));
});

test("keyboard focus on the card link draws a ring around the whole card", async ({
  page,
}) => {
  await openCatalog(page, 1440);
  const card = page.locator("main article").first();
  await card.getByRole("link").focus();

  const ring = await card.getByRole("link").evaluate((link) => {
    const after = getComputedStyle(link, "::after");
    return { style: after.outlineStyle, width: parseFloat(after.outlineWidth) };
  });
  expect(ring.style).not.toBe("none");
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test("a discounted product shows a struck-through price and a -NN% badge", async ({
  page,
}) => {
  await openCatalog(page, 1440);
  const card = page
    .locator("main article")
    .filter({ has: page.getByRole("link", { name: DISCOUNTED_PRODUCT }) });
  await expect(card).toHaveCount(1);

  const struck = await card.evaluate((element) =>
    Array.from(element.querySelectorAll("*"))
      .filter(
        (node) =>
          getComputedStyle(node).textDecorationLine.includes("line-through") &&
          node.children.length === 0,
      )
      .map((node) => node.textContent?.trim()),
  );
  expect(struck).toHaveLength(1);
  expect(struck[0]).toContain("249.000");
  await expect(card.getByText("-20%", { exact: true })).toBeVisible();
});

test("a product without a discount shows a plain price and no badge", async ({
  page,
}) => {
  await openCatalog(page, 1440);
  const card = page
    .locator("main article")
    .filter({
      has: page.getByRole("link", { name: "Seamless Performance Training Tee" }),
    });
  await expect(card).toHaveCount(1);

  await expect(card.getByText(/^-\d+%$/)).toHaveCount(0);
  const struck = await card.evaluate(
    (element) =>
      Array.from(element.querySelectorAll("*")).filter((node) =>
        getComputedStyle(node).textDecorationLine.includes("line-through"),
      ).length,
  );
  expect(struck).toBe(0);
});

test("the catalog never scrolls sideways", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await openCatalog(page, width);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      cardsOutside: Array.from(document.querySelectorAll("main article"))
        .filter((card) => {
          const box = card.getBoundingClientRect();
          return box.left < 0 || box.right > window.innerWidth;
        })
        .length,
    }));
    expect(overflow.scrollWidth, `page width at ${width}px`).toBeLessThanOrEqual(
      width,
    );
    expect(overflow.cardsOutside, `cards outside at ${width}px`).toBe(0);
  }
});

test("a narrow card keeps its price inside the card", async ({ page }) => {
  await openCatalog(page, 320);
  const clipped = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main article"))
      .filter((card) => {
        const bounds = card.getBoundingClientRect();
        return Array.from(card.querySelectorAll("*")).some((node) => {
          const box = node.getBoundingClientRect();
          return box.width > 0 && box.right > bounds.right + 1;
        });
      })
      .length,
  );
  expect(clipped).toBe(0);
});

test("home page headings never skip a level in the product sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const levels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6"))
      .filter((heading) => heading.checkVisibility({ visibilityProperty: true }))
      .map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: (heading.textContent ?? "").trim().slice(0, 40),
        inCard: Boolean(heading.closest("article")),
      })),
  );

  expect(levels.some((heading) => heading.inCard)).toBe(true);
  levels.forEach((heading, index) => {
    if (index === 0) return;
    const jump = heading.level - levels[index - 1].level;
    expect(
      jump,
      `"${heading.text}" (h${heading.level}) follows h${levels[index - 1].level}`,
    ).toBeLessThanOrEqual(1);
  });
});

test("the wishlist page uses the shared card with a remove control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login?next=%2Fwishlist");
  await page.getByLabel("Email address").fill("demo.customer@example.com");
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/wishlist$/);

  const card = page.locator("main article").first();
  await expect(card).toBeVisible();
  await expect(card.getByRole("link")).toHaveCount(1);
  await expect(card.getByRole("button", { name: "Remove" })).toBeVisible();
  // Already saved, so no "save" heart on the image.
  await expect(card.getByRole("button", { name: /save .* to wishlist/i })).toHaveCount(0);
  await expect(card.getByRole("heading", { level: 2 })).toHaveCount(1);
  // The demo wishlist holds one product, so check the column width instead of
  // counting a row: a 2-column grid makes the card about half the viewport.
  const box = (await card.boundingBox())!;
  expect(box.width).toBeGreaterThan(140);
  expect(box.width).toBeLessThan(200);
});
