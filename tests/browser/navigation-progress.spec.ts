import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  FALLBACK_MS,
  NAVIGATION_START_EVENT,
} from "../../src/lib/navigation-progress";
import { findBannedTerms, pageText } from "./support/banned-terms";
import { waitUntilInteractive } from "./support/interactive";

// The thin bar at the top of the window while a page change is under way.
//
// A page change is made slow on purpose and in a way the test controls: the data
// requests the app sends for a client-side page change (and its prefetches) are
// held until the test lets them go. Nothing waits for a real delay, and nothing
// depends on how fast the machine is.

const bar = (page: Page): Locator =>
  page.getByRole("progressbar", { name: "Loading page" });

test.beforeEach(async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
});

// Holds every page-data request until the returned function is called.
async function holdPageRequests(page: Page): Promise<() => void> {
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.searchParams.has("_rsc"),
    async (route) => {
      await released;
      await route.continue().catch(() => {});
    },
  );
  return release;
}

async function openHome(page: Page) {
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await waitUntilInteractive(page, 'main a[href="/products"]');
}

const shopAll = (page: Page) =>
  page.locator("main").getByRole("link", { name: "Shop All Products" });

test.describe("navigation progress bar", () => {
  test("a link click shows the bar while the next page is on its way, and it finishes when the page is there", async ({
    page,
  }) => {
    const release = await holdPageRequests(page);
    try {
      await openHome(page);
      await expect(bar(page)).toHaveCount(0);

      await shopAll(page).click();
      await expect(bar(page)).toBeVisible();
      // The page has not changed yet: the bar is what answers the click.
      expect(new URL(page.url()).pathname).toBe("/");

      release();
      await expect(page).toHaveURL(/\/products$/);
      await expect(page.locator("main h1")).toContainText("Everyday Performance");
      await expect(bar(page)).toHaveCount(0);
    } finally {
      release();
    }
  });

  test("a change of search, filter or sort (not a link) shows the bar too", async ({
    page,
  }) => {
    const release = await holdPageRequests(page);
    try {
      await page.goto("/products");
      await expect(page.locator("main h1")).toBeVisible();
      await waitUntilInteractive(page, "#catalog-sort-select");
      await expect(bar(page)).toHaveCount(0);

      await page.locator("#catalog-sort-select").selectOption("price_asc");
      await expect(bar(page)).toBeVisible();
      expect(new URL(page.url()).searchParams.get("sort")).toBeNull();

      release();
      await expect(page).toHaveURL(/sort=price_asc/);
      await expect(bar(page)).toHaveCount(0);
    } finally {
      release();
    }
  });

  test("the bar sits on the top edge, takes no room, and has a name a shopper can hear", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const release = await holdPageRequests(page);
    try {
      await openHome(page);
      const heightBefore = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );

      await shopAll(page).click();
      await expect(bar(page)).toBeVisible();

      // Fixed to the top edge and thin; it does not move or resize anything.
      const box = await bar(page).boundingBox();
      expect(box?.y).toBe(0);
      expect(box?.height).toBeLessThanOrEqual(4);
      expect(box?.width).toBe(390);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBe(heightBefore);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(390);
      // It never takes a click from the page under it.
      expect(await bar(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe(
        "none",
      );

      // The words a screen reader gets pass the copy guard.
      const words = await pageText(page);
      expect(words).toContain("Loading page");
      expect(findBannedTerms(words)).toEqual([]);

      // It can be told from what is behind it (3:1 is the bar for non-text).
      const ratio = await page.evaluate(() => {
        const fill = document.querySelector('[role="progressbar"] > div');
        // The bar lets clicks through, so this is the page's own element under it.
        const behind = document.elementFromPoint(195, 1);
        if (!fill || !behind) return 0;
        // Colours come back as oklch() and the like: let a canvas turn them into
        // plain red, green and blue.
        const parse = (value: string) => {
          const context = document.createElement("canvas").getContext("2d")!;
          context.fillStyle = "#000";
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
          return { r, g, b, a };
        };
        const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
          const [lr, lg, lb] = [r, g, b].map((channel) => {
            const value = channel / 255;
            return value <= 0.03928
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
        };
        // The colour that shows: the nearest element that paints an opaque one.
        let backdrop = { r: 255, g: 255, b: 255, a: 255 };
        for (let node: Element | null = behind; node; node = node.parentElement) {
          const colour = parse(getComputedStyle(node).backgroundColor);
          if (colour.a === 255) {
            backdrop = colour;
            break;
          }
        }
        const [light, dark] = [
          luminance(parse(getComputedStyle(fill).backgroundColor)),
          luminance(backdrop),
        ].sort((x, y) => y - x);
        return (light + 0.05) / (dark + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(3);

      release();
      await expect(bar(page)).toHaveCount(0);
    } finally {
      release();
    }
  });

  test("with reduced motion the bar does not crawl or animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const release = await holdPageRequests(page);
    try {
      await openHome(page);
      await shopAll(page).click();
      await expect(bar(page)).toBeVisible();

      const fill = bar(page).locator("> div");
      const style = await fill.evaluate((el) => {
        const computed = getComputedStyle(el);
        return {
          transform: computed.transform,
          transition: parseFloat(computed.transitionDuration),
        };
      });
      // Full width from the start, and no transition to get there.
      expect(style.transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
      expect(style.transition).toBeLessThanOrEqual(0.001);

      release();
      await expect(bar(page)).toHaveCount(0);
    } finally {
      release();
    }
  });

  test("without reduced motion the bar is partway and moves", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const release = await holdPageRequests(page);
    try {
      await openHome(page);
      await shopAll(page).click();
      await expect(bar(page)).toBeVisible();
      const scale = await bar(page)
        .locator("> div")
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
      // It never claims to be done while the page is still on its way.
      expect(scale).toBeLessThan(1);
      release();
      await expect(bar(page)).toHaveCount(0);
    } finally {
      release();
    }
  });
});

test.describe("navigation progress bar: it never stays stuck", () => {
  // The address never changes in these, so only the deadline can end the bar. The
  // page's clock is moved by hand: no real wait.
  async function openWithClock(page: Page, path: string) {
    await page.clock.install();
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await waitUntilInteractive(page, "header a");
  }

  const announce = (page: Page, href: string) =>
    page.evaluate(
      ([name, target]) =>
        window.dispatchEvent(new CustomEvent(name, { detail: { href: target } })),
      [NAVIGATION_START_EVENT, href],
    );

  test("a page change that never arrives takes the bar away at its deadline", async ({
    page,
  }) => {
    await openWithClock(page, "/about-demo");

    await announce(page, "/cart");
    await page.clock.runFor(500);
    await expect(bar(page)).toBeVisible();

    await page.clock.runFor(FALLBACK_MS - 1_000);
    await expect(bar(page)).toBeVisible();

    await page.clock.runFor(2_000);
    await expect(bar(page)).toHaveCount(0);
    // Nothing navigated: the deadline alone ended it.
    expect(new URL(page.url()).pathname).toBe("/about-demo");

    // And it is ready for the next one.
    await announce(page, "/cart");
    await page.clock.runFor(500);
    await expect(bar(page)).toBeVisible();
  });

  test("a change to the page the visitor is already on does not start a bar", async ({
    page,
  }) => {
    await openWithClock(page, "/about-demo");

    await announce(page, "/about-demo");
    await announce(page, "/about-demo#top");
    await announce(page, "https://elsewhere.test/cart");
    await page.clock.runFor(2_000);
    await expect(bar(page)).toHaveCount(0);
  });

  test("a click on a link that opens a new tab or leaves the site does not start a bar", async ({
    page,
  }) => {
    await openWithClock(page, "/about-demo");
    // A plain anchor, added to the page: the browser handles it (no Next Link), so
    // there is nothing to wait for.
    await page.evaluate(() => {
      const link = document.createElement("a");
      link.id = "outside";
      link.href = "https://elsewhere.test/";
      link.target = "_blank";
      link.textContent = "Elsewhere";
      document.querySelector("main")?.append(link);
      link.addEventListener("click", (event) => event.preventDefault());
    });
    await page.locator("#outside").click();
    await page.clock.runFor(2_000);
    await expect(bar(page)).toHaveCount(0);
  });
});
