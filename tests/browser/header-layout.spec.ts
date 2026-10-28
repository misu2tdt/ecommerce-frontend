import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [390, 768, 1024, 1100, 1280, 1440, 1920];
// The inline desktop navigation needs about 1280px; below that the compact
// header (hamburger + drawer) is used.
const FULL_HEADER_MIN_WIDTH = 1280;
const DEMO_PASSWORD = "DemoOnly!2026";

async function openHome(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await expect(page.locator("header")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

async function measureHeader(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const nav = document.querySelector('nav[aria-label="Store navigation"]');
    const lineCount = (element: Element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return new Set(
        Array.from(range.getClientRects(), (rect) => Math.round(rect.top)),
      ).size;
    };
    // Only rendered labels: links and the "Shop All" text.
    const labels = nav
      ? Array.from(nav.querySelectorAll("a, button > span")).filter(
          (element) => element.getClientRects().length > 0,
        )
      : [];
    return {
      scrollWidth: document.documentElement.scrollWidth,
      headerHeight: header?.getBoundingClientRect().height ?? 0,
      directLinkCount: nav ? nav.querySelectorAll("a").length : 0,
      labelCount: labels.length,
      wrappedLabels: labels
        .map((element) => ({
          text: element.textContent?.trim() ?? "",
          lines: lineCount(element),
        }))
        .filter((label) => label.lines > 1),
    };
  });
}

for (const width of WIDTHS) {
  const full = width >= FULL_HEADER_MIN_WIDTH;

  test(`header fits without overflow or wrapping at ${width}px`, async ({
    page,
  }) => {
    await openHome(page, width);
    const measured = await measureHeader(page);

    expect(measured.scrollWidth).toBeLessThanOrEqual(width);
    expect(measured.wrappedLabels).toEqual([]);

    const hamburger = page.getByRole("button", {
      name: "Open mobile navigation menu",
    });
    const inlineNav = page.getByRole("navigation", {
      name: "Store navigation",
    });
    if (full) {
      await expect(inlineNav).toBeVisible();
      await expect(hamburger).toBeHidden();
      // "Shop All" plus at most 3 direct category links.
      expect(measured.directLinkCount).toBeLessThanOrEqual(3);
      expect(measured.labelCount).toBeGreaterThanOrEqual(2);
    } else {
      await expect(hamburger).toBeVisible();
      await expect(inlineNav).toBeHidden();
    }
  });
}

test("header height does not change with width inside each mode", async ({
  page,
}) => {
  const heights: Record<"compact" | "full", number[]> = {
    compact: [],
    full: [],
  };
  for (const width of WIDTHS) {
    await openHome(page, width);
    const { headerHeight } = await measureHeader(page);
    heights[width >= FULL_HEADER_MIN_WIDTH ? "full" : "compact"].push(
      headerHeight,
    );
  }

  for (const mode of ["compact", "full"] as const) {
    expect(heights[mode].length).toBeGreaterThan(0);
    expect(Math.max(...heights[mode]) - Math.min(...heights[mode])).toBeLessThan(
      1,
    );
  }
});

test("phone header hides Register and never clips the logo", async ({ page }) => {
  await openHome(page, 390);
  const header = page.locator("header");

  await expect(header.getByRole("link", { name: "Register" })).toBeHidden();
  await expect(header.getByRole("link", { name: "Sign In" })).toBeVisible();

  const logo = header.getByRole("link", { name: /VERVE\s*STUDIO/ });
  const clipped = await logo.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(clipped, "logo text is cut off").toBe(false);
});
test("header controls are at least 44x44 on mobile and tablet", async ({
  page,
}) => {
  const header = page.locator("header");
  for (const width of [390, 768]) {
    await openHome(page, width, 844);
    const controls = [
      header.getByRole("button", { name: "Open mobile navigation menu" }),
      header.getByRole("link", { name: "View saved wishlist items" }),
      header.getByRole("link", { name: "View shopping cart" }),
      header.getByRole("link", { name: "Sign In" }),
    ];
    // Register is hidden on phones and shown from 640px.
    if (width >= 768)
      controls.push(header.getByRole("link", { name: "Register" }));

    for (const control of controls) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box, `control missing at ${width}px: ${control}`).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("signed-in header controls are at least 44x44 on tablet", async ({
  page,
}) => {
  await page.goto("/login?next=%2Faccount");
  await page.getByLabel("Email address").fill("demo.customer@example.com");
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await openHome(page, 768, 844);
  const header = page.locator("header");
  for (const control of [
    header.getByRole("link", { name: "View account profile" }),
    header.getByRole("button", { name: "Sign Out" }),
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("header search uses 16px text on touch widths and shows a visible focus ring", async ({
  page,
}) => {
  await openHome(page, 768, 844);
  // The Suspense fallback reuses this id, so target the live (named) input.
  const search = page.locator('input[name="q"]#desktop-header-search-input');
  await expect(search).toBeVisible();
  await search.focus();

  const style = await search.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      fontSize: parseFloat(computed.fontSize),
      outlineStyle: computed.outlineStyle,
      outlineWidth: parseFloat(computed.outlineWidth),
    };
  });
  expect(style.fontSize).toBeGreaterThanOrEqual(16);
  expect(style.outlineStyle).not.toBe("none");
  expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
});

test("drawer search keeps 16px text and the drawer works below 1280px", async ({
  page,
}) => {
  await openHome(page, 1100);
  const hamburger = page.getByRole("button", {
    name: "Open mobile navigation menu",
  });
  await hamburger.click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  const drawerSearch = drawer.locator("#mobile-header-search-input");
  await expect(drawerSearch).toBeVisible();
  expect(
    await drawerSearch.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await expect(
    drawer.getByRole("link", { name: "Hoodies & Outerwear" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(hamburger).toBeFocused();
});

test("Escape closes the Shop All mega menu on desktop", async ({ page }) => {
  await openHome(page, 1440);
  const trigger = page.getByRole("button", { name: "Shop All" });
  // Keyboard, not click: hovering the trigger already opens the menu, so a
  // mouse click would toggle it shut again.
  await trigger.focus();
  await page.keyboard.press("ArrowDown");

  const menu = page.getByRole("region", {
    name: "Shop categories and collections",
  });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});
