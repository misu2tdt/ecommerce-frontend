import { expect, test, type Page } from "@playwright/test";

// Structure and layout of the home page. Image requests are blocked on purpose:
// CI may be offline for external hosts, and a page whose pictures never load
// must still lay out cleanly. Nothing here depends on a picture arriving.

const CATEGORY_LABELS = [
  "T-Shirts & Tops",
  "Shirts & Polos",
  "Hoodies & Outerwear",
  "Pants & Shorts",
  "Basics & Accessories",
];
const BRAND_LABELS = ["Veloce Active", "Monolith Studio"];

test.beforeEach(async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
});

async function openHome(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

const hero = (page: Page) =>
  page.locator("main section").filter({ has: page.locator("h1") });

// Cards per row and total cards, by grouping the top edge of each card.
async function gridShape(page: Page, section: string) {
  return page
    .locator("main section")
    .filter({ has: page.getByRole("heading", { level: 2, name: section }) })
    .evaluate((element) => {
      const tops = Array.from(element.querySelectorAll("article")).map((card) =>
        Math.round(card.getBoundingClientRect().top),
      );
      return {
        total: tops.length,
        perRow: tops.filter((top) => top === tops[0]).length,
      };
    });
}

// The page fetches its products on the server, from the real seeded backend
// that Playwright starts, so this fails if that request is rejected (a 400 for
// a parameter the backend does not accept, a 429, an outage). The page then
// swallows the error and shows the "unavailable" box instead of cards.
test("the home page shows real product cards, not the unavailable message", async ({
  page,
}) => {
  await openHome(page, 1440);

  await expect(page.getByText("temporarily unavailable")).toHaveCount(0);
  await expect(page.locator("main article")).toHaveCount(16);
});

test("the hero has one h1 and a decorative 3:2 banner from the image optimizer", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await openHome(page, width);
    await expect(page.locator("h1")).toHaveCount(1);

    const image = hero(page).locator("img");
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute("alt", "");

    const source = `${await image.getAttribute("src")} ${await image.getAttribute("srcset")}`;
    expect(source).toContain("/_next/image");
    expect(decodeURIComponent(source)).toContain("res.cloudinary.com");

    const box = (await image.boundingBox())!;
    expect(box.width / box.height, `hero ratio at ${width}px`).toBeGreaterThan(1.45);
    expect(box.width / box.height, `hero ratio at ${width}px`).toBeLessThan(1.55);
  }
});

test("the hero image comes first on phones and second beside the text on large screens", async ({
  page,
}) => {
  await openHome(page, 390);
  const phoneImage = (await hero(page).locator("img").boundingBox())!;
  const phoneTitle = (await page.locator("h1").boundingBox())!;
  expect(phoneImage.y).toBeLessThan(phoneTitle.y);

  await openHome(page, 1440);
  const image = (await hero(page).locator("img").boundingBox())!;
  const title = (await page.locator("h1").boundingBox())!;
  expect(title.x).toBeLessThan(image.x);
});

test("the hero keeps one primary and one outline button", async ({ page }) => {
  await openHome(page, 1440);
  const links = hero(page).getByRole("link");
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveText("Shop All Products");
  await expect(links.nth(1)).toHaveText("Explore Categories");
});

test("the page never scrolls sideways", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await openHome(page, width);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth, `page width at ${width}px`).toBeLessThanOrEqual(width);
  }
});

test("on a phone the categories scroll sideways on their own, the page does not", async ({
  page,
}) => {
  await openHome(page, 390);
  const scroller = page.locator("#categories ul");
  const metrics = await scroller.evaluate((element) => {
    const before = element.scrollLeft;
    element.scrollLeft = 200;
    return {
      scrollable: element.scrollWidth > element.clientWidth,
      moved: element.scrollLeft - before,
      overflowX: getComputedStyle(element).overflowX,
      snap: getComputedStyle(element).scrollSnapType,
      page: document.documentElement.scrollWidth,
    };
  });
  expect(metrics.scrollable).toBe(true);
  expect(metrics.moved).toBeGreaterThan(0);
  expect(metrics.overflowX).toBe("auto");
  expect(metrics.snap).toContain("x");
  expect(metrics.page).toBeLessThanOrEqual(390);

  // About three quarters wide, so the next card peeks in.
  await scroller.evaluate((element) => (element.scrollLeft = 0));
  const cards = scroller.getByRole("link");
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  expect(first.width / 390).toBeGreaterThan(0.65);
  expect(first.width / 390).toBeLessThan(0.78);
  expect(second.x).toBeLessThan(390);
  expect(second.x + second.width).toBeGreaterThan(390);
});

test("five category cards sit in one row on a wide screen and no card is alone at other widths", async ({
  page,
}) => {
  const rows = async () =>
    page.locator("#categories ul > li").evaluateAll((items) => {
      const groups = new Map<number, number>();
      for (const item of items) {
        const top = Math.round(item.getBoundingClientRect().top);
        groups.set(top, (groups.get(top) ?? 0) + 1);
      }
      return [...groups.values()];
    });

  await openHome(page, 1440);
  expect(await rows()).toEqual([5]);

  await openHome(page, 1024);
  expect(await rows()).toEqual([5]);

  await openHome(page, 768);
  const tablet = await rows();
  expect(tablet.reduce((sum, count) => sum + count, 0)).toBe(5);
  expect(tablet.every((count) => count >= 2)).toBe(true);
});

test("every category card is one link named exactly like its label", async ({
  page,
}) => {
  await openHome(page, 1440);
  const section = page.locator("#categories");
  const cards = section.locator("ul > li");
  await expect(cards).toHaveCount(CATEGORY_LABELS.length);

  for (const label of CATEGORY_LABELS) {
    await expect(section.getByRole("link", { name: label, exact: true })).toHaveCount(1);
  }
  for (let index = 0; index < CATEGORY_LABELS.length; index += 1) {
    await expect(cards.nth(index).getByRole("link")).toHaveCount(1);
    // The picture is decorative: it adds nothing to the link name.
    await expect(cards.nth(index).locator("img")).toHaveAttribute("alt", "");
  }
});

test("every brand card is one link named exactly like its label", async ({
  page,
}) => {
  await openHome(page, 1440);
  for (const label of BRAND_LABELS) {
    const card = page
      .locator("main li")
      .filter({ has: page.getByRole("heading", { level: 3, name: label }) });
    await expect(card).toHaveCount(1);
    await expect(card.getByRole("link")).toHaveCount(1);
    await expect(card.getByRole("link", { name: label, exact: true })).toHaveCount(1);
    await expect(card.locator("img")).toHaveAttribute("alt", "");
  }
});

test("each product section has 8 cards in complete rows: 2 columns on a phone, 4 on a wide screen", async ({
  page,
}) => {
  for (const section of ["Featured Collection", "Everyday Essentials"]) {
    await openHome(page, 390);
    const phone = await gridShape(page, section);
    expect(phone.total, `${section} cards`).toBe(8);
    expect(phone.perRow).toBe(2);
    expect(phone.total % phone.perRow).toBe(0);

    await openHome(page, 1440);
    const wide = await gridShape(page, section);
    expect(wide.perRow).toBe(4);
    expect(wide.total % wide.perRow).toBe(0);
  }
});

test("headings never skip a level", async ({ page }) => {
  await openHome(page, 1440);
  const headings = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4"))
      .filter((heading) => heading.checkVisibility({ visibilityProperty: true }))
      .map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: (heading.textContent ?? "").trim().slice(0, 40),
      })),
  );

  expect(headings[0].level).toBe(1);
  headings.forEach((heading, index) => {
    if (index === 0) return;
    expect(
      heading.level - headings[index - 1].level,
      `"${heading.text}" (h${heading.level}) follows h${headings[index - 1].level}`,
    ).toBeLessThanOrEqual(1);
  });
});

test("the value points appear once, in one strip, and the old pillars section is gone", async ({
  page,
}) => {
  await openHome(page, 1440);
  const main = page.locator("main");

  await expect(main.getByText("Why Shop With Us")).toHaveCount(0);
  await expect(main.getByText("Practical Fashion, Built on Trust")).toHaveCount(0);
  for (const title of [
    "Live Inventory",
    "Integer VND",
    "Verified Reviews",
    "Secure Checkout",
  ]) {
    await expect(main.getByText(title, { exact: true })).toHaveCount(1);
  }

  const strip = main
    .locator("section")
    .filter({ has: page.getByText("Live Inventory", { exact: true }) });
  await expect(strip).toHaveCount(1);
  expect(await strip.locator("li").count()).toBe(4);
});

test("with every image blocked the layout stays clean", async ({ page }) => {
  for (const width of [390, 1440]) {
    await openHome(page, width);
    // Blocked pictures leave empty, neutral boxes of the right size.
    const boxes = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main img")).map((img) => {
        const box = img.parentElement!.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
    // Hero, five categories and two brands (product cards use the image-free
    // placeholder on the test seed).
    expect(boxes.length).toBe(8);
    for (const box of boxes) {
      expect(box.width).toBeGreaterThan(50);
      expect(box.height).toBeGreaterThan(30);
    }
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(width);
  }
});
