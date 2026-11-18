import { expect, test, type Locator, type Page } from "@playwright/test";
import { findBannedTerms, pageText } from "./support/banned-terms";
import { waitUntilInteractive } from "./support/interactive";
import { lowContrast } from "./support/payment-simulator";
import { MIN_READABLE_SHARE, READABLE_PX, measureReadableShare } from "./support/readable-share";
import { skipProductPhotos } from "./support/shop";

// The catalog's filters on a desktop screen: a bar of buttons above the grid, each
// opening a small panel. Below lg the phone drawer is used instead (unchanged).
// The results are server-rendered for the address, so every check that a choice
// "worked" looks at the address and at the chips of the active filters.

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

const BAR = '[role="group"][aria-label="Catalog filters"]';
const GROUPS = ["Category", "Brand", "Size", "Color", "Price"] as const;
type Group = (typeof GROUPS)[number];

const trigger = (page: Page, group: Group): Locator =>
  page.locator(BAR).getByRole("button", { name: new RegExp(`^${group}\\b`) });
const panel = (page: Page, group: Group): Locator =>
  page.getByRole("group", { name: `${group} options` });
const searchOf = (page: Page) => new URL(page.url()).searchParams;

async function openCatalog(page: Page, path = "/products", width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await expect(page.locator("main h1")).toBeVisible();
  await waitUntilInteractive(page, `${BAR} button`);
}

// ---- what is on the page -----------------------------------------------------------

test.describe("the filter bar", () => {
  test("is a row of five group buttons above the grid, with no sidebar", async ({ page }) => {
    await openCatalog(page);

    await expect(page.locator(BAR)).toBeVisible();
    for (const group of GROUPS) {
      const button = trigger(page, group);
      await expect(button, group).toBeVisible();
      await expect(button, group).toHaveAttribute("aria-expanded", "false");
      await expect(button, group).toHaveAttribute("aria-controls", /.+/);
      // Closed panels are not on screen (nor in the accessibility tree).
      await expect(panel(page, group), group).toHaveCount(0);
    }
    await expect(
      page.getByRole("button", { name: "In stock only", exact: true }),
    ).toBeVisible();
    // Nothing to clear yet.
    await expect(page.getByRole("link", { name: "Clear all filters" })).toHaveCount(0);

    // The grid has the whole width: its first card starts where the bar does.
    const barBox = (await page.locator(BAR).boundingBox())!;
    const cardBox = (await page.locator("main article").first().boundingBox())!;
    expect(Math.abs(cardBox.x - barBox.x)).toBeLessThanOrEqual(2);
  });

  test("the result count and the sort sit on the same row as the filters", async ({ page }) => {
    await openCatalog(page);
    const middle = async (locator: Locator) => {
      const box = (await locator.boundingBox())!;
      return box.y + box.height / 2;
    };
    const filters = await middle(trigger(page, "Category"));
    const count = await middle(page.getByRole("status").filter({ hasText: /Showing/ }));
    const sort = await middle(page.locator("#catalog-sort-select"));
    expect(Math.abs(count - filters), "count").toBeLessThan(16);
    expect(Math.abs(sort - filters), "sort").toBeLessThan(16);
  });

  test("the grid shows four products to a row on a wide screen", async ({ page }) => {
    await openCatalog(page);
    const tops = await page
      .locator("main article")
      .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    expect(tops.filter((top) => top === tops[0])).toHaveLength(4);
  });

  test("on a phone and a tablet the bar is not there and the drawer button is", async ({ page }) => {
    for (const width of [320, 390, 768]) {
      await openCatalog(page, "/products", width);
      await expect(page.locator(BAR), `${width}px`).toBeHidden();
      await expect(
        page.locator('button[aria-controls="mobile-filter-dialog"]'),
        `${width}px`,
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `no sideways scroll at ${width}px`,
      ).toBeLessThanOrEqual(width);
    }
  });
});

// ---- opening, closing, focus -----------------------------------------------------------

test.describe("the filter panels", () => {
  test("a button opens its panel, and only one panel is open at a time", async ({ page }) => {
    await openCatalog(page);
    const category = trigger(page, "Category");
    const brand = trigger(page, "Brand");

    await category.click();
    await expect(category).toHaveAttribute("aria-expanded", "true");
    const controlled = await category.getAttribute("aria-controls");
    await expect(page.locator(`[id="${controlled}"]`)).toBeVisible();
    await expect(panel(page, "Category")).toBeVisible();

    await brand.click();
    await expect(brand).toHaveAttribute("aria-expanded", "true");
    await expect(category).toHaveAttribute("aria-expanded", "false");
    await expect(panel(page, "Brand")).toBeVisible();
    await expect(panel(page, "Category")).toHaveCount(0);

    // The same button closes it again.
    await brand.click();
    await expect(brand).toHaveAttribute("aria-expanded", "false");
    await expect(panel(page, "Brand")).toHaveCount(0);
  });

  test("Escape closes the panel and puts focus back on its button", async ({ page }) => {
    await openCatalog(page);
    const size = trigger(page, "Size");

    await size.click();
    await expect(panel(page, "Size")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page, "Size")).toHaveCount(0);
    await expect(size).toBeFocused();

    // Also when focus is inside the panel.
    await size.focus();
    await page.keyboard.press("ArrowDown");
    await expect(panel(page, "Size").getByRole("button").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel(page, "Size")).toHaveCount(0);
    await expect(size).toBeFocused();
  });

  test("a click outside the bar closes the panel", async ({ page }) => {
    await openCatalog(page);
    await trigger(page, "Category").click();
    await expect(panel(page, "Category")).toBeVisible();

    await page.locator("main h1").click();
    await expect(panel(page, "Category")).toHaveCount(0);
    await expect(trigger(page, "Category")).toHaveAttribute("aria-expanded", "false");
  });

  test("moving focus out of the bar closes the panel", async ({ page }) => {
    await openCatalog(page);
    await trigger(page, "Brand").click();
    await expect(panel(page, "Brand")).toBeVisible();

    await page.locator("#catalog-sort-select").focus();
    await expect(panel(page, "Brand")).toHaveCount(0);
  });

  test("the keyboard opens a panel, moves inside it and leaves it", async ({ page }) => {
    await openCatalog(page);
    const category = trigger(page, "Category");

    // Enter opens it and carries focus to the choice that is selected ("All").
    await category.focus();
    await page.keyboard.press("Enter");
    const options = panel(page, "Category").getByRole("button");
    await expect(options.first()).toBeFocused();
    await expect(options.first()).toHaveAttribute("aria-pressed", "true");
    const count = await options.count();
    expect(count).toBeGreaterThan(2);

    await page.keyboard.press("ArrowDown");
    await expect(options.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(options.first()).toBeFocused();
    await page.keyboard.press("ArrowUp"); // wraps round to the last one
    await expect(options.nth(count - 1)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(options.first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(options.nth(count - 1)).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(category).toBeFocused();
    await expect(panel(page, "Category")).toHaveCount(0);

    // Space opens it too, and so does the down arrow on the button.
    await page.keyboard.press("Space");
    await expect(options.first()).toBeFocused();
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowDown");
    await expect(options.first()).toBeFocused();
  });

  test("a button with choices says so: a badge, and a name a screen reader reads", async ({
    page,
  }) => {
    await openCatalog(page, "/products?size=M&size=L&maxPrice=500000");
    await expect(trigger(page, "Size")).toHaveAccessibleName(/Size.*2 selected/);
    await expect(trigger(page, "Size")).toContainText("2");
    await expect(trigger(page, "Price")).toHaveAccessibleName(/Price.*1 selected/);
    await expect(trigger(page, "Category")).not.toHaveAccessibleName(/selected/);
  });
});

// ---- choosing: the address and the chips -----------------------------------------------

test.describe("choosing a filter", () => {
  test("a category sets the address, starts again from page 1 and shows as a chip", async ({
    page,
  }) => {
    await openCatalog(page, "/products?page=2");
    await expect(page).toHaveURL(/page=2/);

    await trigger(page, "Category").click();
    const choice = panel(page, "Category").getByRole("button").nth(1);
    const name = (await choice.innerText()).trim();
    await choice.click();

    await expect(page).toHaveURL(/category=/);
    expect(searchOf(page).has("page")).toBe(false);
    await expect(page.getByText(`Category: ${name}`, { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "matching filters" })).toBeVisible();
    // A single choice settles the group: the panel closes. The page number changed
    // here, so the catalog's own rule applies: focus goes to the start of the
    // results (see PageFocus), where a screen reader announces them.
    await expect(trigger(page, "Category")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#catalog-results")).toBeFocused();
    await expect(trigger(page, "Category")).toHaveAccessibleName(/1 selected/);

    // Choosing "All" again takes it off.
    await trigger(page, "Category").click();
    await panel(page, "Category").getByRole("button").first().click();
    await expect(page).not.toHaveURL(/category=/);
    await expect(page.getByText(`Category: ${name}`, { exact: true })).toHaveCount(0);
  });

  test("a brand works the same way", async ({ page }) => {
    await openCatalog(page);
    await trigger(page, "Brand").click();
    const choice = panel(page, "Brand").getByRole("button").nth(1);
    const name = (await choice.innerText()).trim();
    await choice.click();

    await expect(page).toHaveURL(/brand=/);
    await expect(page.getByText(`Brand: ${name}`, { exact: true })).toBeVisible();
    await expect(trigger(page, "Brand")).toHaveAccessibleName(/1 selected/);
    // The page number did not change, so focus is simply back on the button.
    await expect(panel(page, "Brand")).toHaveCount(0);
    await expect(trigger(page, "Brand")).toBeFocused();
  });

  test("sizes can be added one after the other: the panel stays open and each shows as a chip", async ({
    page,
  }) => {
    await openCatalog(page);
    await trigger(page, "Size").click();
    const chips = panel(page, "Size").getByRole("button");
    const first = (await chips.nth(0).innerText()).trim();
    const second = (await chips.nth(1).innerText()).trim();

    await chips.nth(0).click();
    await expect(page).toHaveURL(new RegExp(`size=${encodeURIComponent(first)}`));
    await expect(chips.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(panel(page, "Size")).toBeVisible();

    await chips.nth(1).click();
    await expect.poll(() => searchOf(page).getAll("size")).toEqual([first, second]);
    await expect(page.getByText(`Size: ${first}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Size: ${second}`, { exact: true })).toBeVisible();
    await expect(trigger(page, "Size")).toHaveAccessibleName(/2 selected/);
    await expect(panel(page, "Size")).toBeVisible();

    // Choosing a selected size again removes it.
    await chips.nth(0).click();
    await expect.poll(() => searchOf(page).getAll("size")).toEqual([second]);

    await panel(page, "Size").getByRole("button", { name: "Reset sizes" }).click();
    await expect.poll(() => searchOf(page).has("size")).toBe(false);
  });

  test("colors work like sizes", async ({ page }) => {
    await openCatalog(page);
    await trigger(page, "Color").click();
    const chips = panel(page, "Color").getByRole("button");
    const name = (await chips.nth(0).innerText()).trim();
    await chips.nth(0).click();

    await expect.poll(() => searchOf(page).getAll("color")).toEqual([name]);
    await expect(page.getByText(`Color: ${name}`, { exact: true })).toBeVisible();
    await expect(trigger(page, "Color")).toHaveAccessibleName(/1 selected/);
  });

  test("a price range is applied with the button or the Enter key, and a preset sets it too", async ({
    page,
  }) => {
    await openCatalog(page);
    await trigger(page, "Price").click();
    const price = panel(page, "Price");
    await price.getByLabel("Minimum price in VND").fill("100000");
    await price.getByLabel("Maximum price in VND").fill("500000");
    await price.getByRole("button", { name: "Apply Price" }).click();

    await expect(page).toHaveURL(/minPrice=100000&maxPrice=500000/);
    // (The sort list has options that start with "Price: " too: look for digits.)
    await expect(page.getByText(/^Price: [\d.]+/)).toBeVisible();
    await expect(trigger(page, "Price")).toHaveAccessibleName(/1 selected/);
    await expect(panel(page, "Price")).toHaveCount(0);

    // The boxes show the range that is applied, and Enter applies a change.
    await trigger(page, "Price").click();
    await expect(price.getByLabel("Minimum price in VND")).toHaveValue("100000");
    await price.getByLabel("Maximum price in VND").fill("300000");
    await price.getByLabel("Maximum price in VND").press("Enter");
    await expect(page).toHaveURL(/maxPrice=300000/);

    await trigger(page, "Price").click();
    await price.getByRole("button", { name: /^Under / }).click();
    await expect.poll(() => [searchOf(page).get("minPrice"), searchOf(page).get("maxPrice")]).toEqual([
      null,
      "250000",
    ]);

    await trigger(page, "Price").click();
    await price.getByRole("button", { name: "Reset price" }).click();
    await expect.poll(() => searchOf(page).has("maxPrice")).toBe(false);
    await expect(page.getByText(/^(Min |Max )?Price: [\d.]+/)).toHaveCount(0);
  });

  test("a box left empty is not sent, and the browser stops a price above the limit", async ({
    page,
  }) => {
    await openCatalog(page);
    await trigger(page, "Price").click();
    const price = panel(page, "Price");
    await price.getByLabel("Maximum price in VND").fill("400000");
    await price.getByRole("button", { name: "Apply Price" }).click();

    await expect(page).toHaveURL(/maxPrice=400000/);
    expect(searchOf(page).has("minPrice")).toBe(false);
    // The panel is closed now; its boxes are still in the page, and the cap is on them.
    await expect(page.getByLabel("Maximum price in VND").first()).toHaveAttribute(
      "max",
      "1000000000000",
    );
  });

  test("in stock only toggles, and Clear all takes every filter off but keeps the sort", async ({
    page,
  }) => {
    await openCatalog(page, "/products?sort=price_asc");
    // Exact: the chip that appears later has a "Remove filter In Stock Only" button.
    const stock = page.getByRole("button", { name: "In stock only", exact: true });
    await expect(stock).toHaveAttribute("aria-pressed", "false");

    await stock.click();
    await expect(page).toHaveURL(/inStock=true/);
    await expect(stock).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("In Stock Only", { exact: true })).toBeVisible();

    await trigger(page, "Category").click();
    await panel(page, "Category").getByRole("button").nth(1).click();
    await expect(page).toHaveURL(/category=/);

    const clear = page.getByRole("link", { name: "Clear all filters" });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page).toHaveURL(/\/products\?sort=price_asc$/);
    await expect(page.getByRole("link", { name: "Clear all filters" })).toHaveCount(0);
    await expect(stock).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Active filters:")).toHaveCount(0);
  });

  test("the chips of the active filters stay under the bar and still remove a filter", async ({
    page,
  }) => {
    await openCatalog(page, "/products?inStock=true");
    const chip = page.getByText("In Stock Only", { exact: true });
    await expect(chip).toBeVisible();
    const chipBox = (await chip.boundingBox())!;
    const barBox = (await page.locator(BAR).boundingBox())!;
    expect(chipBox.y, "the chips are below the bar").toBeGreaterThan(barBox.y + barBox.height - 1);

    await page.getByRole("button", { name: "Remove filter In Stock Only" }).click();
    await expect(page).not.toHaveURL(/inStock/);
  });
});

// ---- the layout guards -------------------------------------------------------------------

test.describe("the filter bar: layout guards", () => {
  for (const width of [1024, 1440]) {
    test(`at ${width}px every panel fits the window, with 44px targets, readable text and contrast`, async ({
      page,
    }) => {
      await openCatalog(page, "/products", width);

      for (const group of GROUPS) {
        await trigger(page, group).click();
        const open = panel(page, group);
        await expect(open, group).toBeVisible();

        // Inside the window, and no taller than it.
        const box = (await open.boundingBox())!;
        expect(box.x, `${group} left edge`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${group} right edge`).toBeLessThanOrEqual(width);
        expect(box.height, `${group} height`).toBeLessThanOrEqual(900);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          `${group}: no sideways scroll`,
        ).toBeLessThanOrEqual(width);

        // Every control in the bar is at least 44px high, and its text 14px.
        const small = await page.locator(BAR).evaluate((bar, minimum) => {
          const found: string[] = [];
          for (const element of bar.querySelectorAll("button, a, input")) {
            if (!(element as HTMLElement).checkVisibility({ visibilityProperty: true })) continue;
            const height = element.getBoundingClientRect().height;
            if (height < minimum - 0.5) {
              found.push(`${element.tagName} "${(element.textContent ?? "").trim().slice(0, 30)}" ${height}px`);
            }
          }
          return found;
        }, 44);
        expect(small, `${group}: targets under 44px`).toEqual([]);

        const tiny = await page.locator(BAR).evaluate((bar, minimum) => {
          const found: string[] = [];
          const walker = document.createTreeWalker(bar, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const element = node.parentElement;
            if (!element || !(node.textContent ?? "").trim()) continue;
            if (!element.checkVisibility({ visibilityProperty: true })) continue;
            const size = parseFloat(getComputedStyle(element).fontSize);
            if (size < minimum) found.push(`"${(node.textContent ?? "").trim().slice(0, 30)}" ${size}px`);
          }
          return found;
        }, READABLE_PX);
        expect(tiny, `${group}: text under ${READABLE_PX}px`).toEqual([]);

        expect(await lowContrast(page, BAR), `${group}: contrast`).toEqual([]);

        const words = await pageText(page);
        expect(findBannedTerms(words), `${group}: copy`).toEqual([]);
        const { total, readable } = await measureReadableShare(page);
        expect(readable / total, `${group}: readable share`).toBeGreaterThanOrEqual(
          MIN_READABLE_SHARE,
        );

        await page.keyboard.press("Escape");
        await expect(open).toHaveCount(0);
      }
    });
  }

  test("at 1024px the bar wraps without anything leaving the window", async ({ page }) => {
    await openCatalog(page, "/products?category=tops&inStock=true&sort=price_asc", 1024);
    for (const locator of [
      page.locator(BAR),
      page.locator("#catalog-sort-select"),
      page.getByRole("status").filter({ hasText: /Showing|No products/ }),
    ]) {
      const box = (await locator.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1024);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  });
});

// ---- the phone drawer is unchanged -------------------------------------------------------------

test.describe("the phone drawer", () => {
  test("still holds every filter and changes the address the same way", async ({ page }) => {
    await openCatalog(page, "/products", 390);
    await page.locator('button[aria-controls="mobile-filter-dialog"]').click();

    const dialog = page.getByRole("dialog", { name: "Filters" });
    await expect(dialog).toBeVisible();
    for (const heading of ["Category", "Brand", "Size", "Color", "Price Range (VND)"]) {
      await expect(dialog.getByRole("heading", { name: heading })).toBeVisible();
    }
    await expect(dialog.getByRole("button", { name: "Apply Price" })).toBeVisible();
    await expect(dialog.getByLabel("In stock only")).toBeVisible();
    await expect(dialog.getByLabel("Minimum price in VND")).toHaveAttribute("max", "1000000000000");

    const choice = dialog.locator("aside ul").first().getByRole("button").nth(1);
    const name = (await choice.innerText()).trim();
    await choice.click();

    await expect(page).toHaveURL(/category=/);
    expect(searchOf(page).has("page")).toBe(false);
    // The drawer closes when the address changes, and the chip is there.
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`Category: ${name}`, { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });
});
