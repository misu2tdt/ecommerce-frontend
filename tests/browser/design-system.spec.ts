import { expect, test, type Page } from "@playwright/test";

// Browser checks for the design system: one loaded font, readable text sizes,
// a working skip link and field borders that pass the 3:1 non-text contrast rule.

const VIEWPORT = { width: 1440, height: 900 };
const READABLE_PX = 14;
const MIN_READABLE_SHARE = 0.95;

async function firstProductPath(page: Page) {
  await page.goto("/products");
  const href = await page
    .locator('main a[href^="/products/"]')
    .first()
    .getAttribute("href");
  expect(href, "the catalog needs at least one product").toBeTruthy();
  return href!.split("?")[0];
}

async function settle(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

// Share of rendered, non-whitespace characters at or above READABLE_PX.
async function measureReadableShare(page: Page) {
  return page.evaluate((readablePx) => {
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
    let total = 0;
    let readable = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || skip.has(element.tagName)) continue;
      const characters = (node.textContent ?? "").replace(/\s+/g, "").length;
      if (!characters || !element.checkVisibility({ visibilityProperty: true }))
        continue;
      total += characters;
      if (parseFloat(getComputedStyle(element).fontSize) >= readablePx)
        readable += characters;
    }
    return { total, readable };
  }, READABLE_PX);
}

// Any CSS colour (oklch, color-mix, ...) -> sRGB, by letting a canvas parse it.
async function toRgb(page: Page, colour: string) {
  return page.evaluate((value) => {
    const context = document.createElement("canvas").getContext("2d")!;
    context.fillStyle = "#000";
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b] as [number, number, number];
  }, colour);
}

function contrastRatio(a: number[], b: number[]) {
  const luminance = ([r, g, b]: number[]) => {
    const [lr, lg, lb] = [r, g, b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe("design system in the browser", () => {
  test.use({ viewport: VIEWPORT });

  const pages: Array<[string, string]> = [
    ["home", "/"],
    ["catalog", "/products"],
    ["login", "/login"],
  ];

  for (const [name, path] of pages) {
    test(`${name}: Inter is the loaded body font and text is readable`, async ({
      page,
    }) => {
      await settle(page, path);

      const fontFamily = await page.evaluate(
        () => getComputedStyle(document.body).fontFamily,
      );
      // next/font renames the family (for example "__Inter_a1b2c3").
      expect(fontFamily).toMatch(/^["']?(__)?inter/i);

      const loadedInter = await page.evaluate(() =>
        [...document.fonts].filter(
          (face) => /inter/i.test(face.family) && face.status === "loaded",
        ).length,
      );
      expect(loadedInter, "an Inter font face should be loaded").toBeGreaterThan(0);

      const { total, readable } = await measureReadableShare(page);
      const share = readable / total;
      console.log(
        `[readable text] ${name}: ${(share * 100).toFixed(1)}% of ${total} characters are >= ${READABLE_PX}px`,
      );
      test.info().annotations.push({
        type: "readable-share",
        description: `${name}: ${(share * 100).toFixed(1)}%`,
      });
      expect(share).toBeGreaterThanOrEqual(MIN_READABLE_SHARE);
    });
  }

  test("product page: Inter is loaded and text is readable", async ({ page }) => {
    await settle(page, await firstProductPath(page));

    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(fontFamily).toMatch(/^["']?(__)?inter/i);

    const { total, readable } = await measureReadableShare(page);
    const share = readable / total;
    console.log(
      `[readable text] product: ${(share * 100).toFixed(1)}% of ${total} characters are >= ${READABLE_PX}px`,
    );
    test.info().annotations.push({
      type: "readable-share",
      description: `product: ${(share * 100).toFixed(1)}%`,
    });
    expect(share).toBeGreaterThanOrEqual(MIN_READABLE_SHARE);
  });

  test("every footer link and nav link is at least 14px", async ({ page }) => {
    await settle(page, "/");

    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll("footer a, nav a")]
        .filter((link) => link.checkVisibility({ visibilityProperty: true }))
        .map((link) => ({
          text: (link.textContent ?? "").trim().slice(0, 40),
          size: parseFloat(getComputedStyle(link).fontSize),
        })),
    );

    expect(sizes.length).toBeGreaterThan(5);
    const tooSmall = sizes.filter((link) => link.size < READABLE_PX);
    expect(tooSmall).toEqual([]);
  });

  test("the skip link is the first tab stop and moves focus to the main content", async ({
    page,
  }) => {
    await settle(page, "/");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: /skip to (main )?content/i });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");

    await page.keyboard.press("Enter");
    await expect(page.locator("main#main-content")).toBeFocused();
  });

  test("login form fields have a border with at least 3:1 contrast", async ({
    page,
  }) => {
    await settle(page, "/login");

    const background = await toRgb(
      page,
      await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    );
    for (const label of ["Email address", "Password"]) {
      const field = page.getByLabel(label);
      const borderColour = await field.evaluate(
        (element) => getComputedStyle(element).borderTopColor,
      );
      const ratio = contrastRatio(await toRgb(page, borderColour), background);
      console.log(`[field border] ${label}: ${ratio.toFixed(2)}:1`);
      expect(ratio, `${label} border contrast`).toBeGreaterThanOrEqual(3);
    }
  });
});
