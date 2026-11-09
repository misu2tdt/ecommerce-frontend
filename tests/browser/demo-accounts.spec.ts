import { expect, test, type Locator, type Page } from "@playwright/test";
import { CUSTOMER, OTHER_USER, signIn, skipProductPhotos } from "./support/shop";

// The Demo accounts page lists the sample customer and admin sign-ins, and a
// link in the top bar (from md up) or the menu drawer (phones) leads to it.

const CUSTOMER_EMAIL = "demo.customer@example.com";
const ADMIN_EMAIL = "demo.admin@example.com";
const PASSWORD = "DemoOnly!2026";

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

async function open(page: Page, width: number, path = "/demo-accounts") {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const headerLink = (page: Page) =>
  page.locator("header").getByRole("link", { name: "Demo accounts" });

test.describe("the page", () => {
  test("loads with one h1 and its own title", async ({ page }) => {
    await open(page, 1440);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Demo accounts");
    await expect(page).toHaveTitle("Demo accounts | VERVE STUDIO");
    await expect(
      page.getByRole("heading", { level: 2, name: "Customer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Admin" }),
    ).toBeVisible();
  });

  test("shows both emails, the password and the notice", async ({ page }) => {
    await open(page, 1440);
    const main = page.locator("main");

    await expect(main.getByText(CUSTOMER_EMAIL, { exact: true })).toBeVisible();
    await expect(main.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
    // One password for each account.
    await expect(main.getByText(PASSWORD, { exact: true })).toHaveCount(2);

    await expect(main.getByText(/portfolio demo, not a real shop/i)).toBeVisible();
    await expect(main.getByText(/shared by every visitor/i)).toBeVisible();
    await expect(
      main.getByText(/visible to everyone, and the data may be reset/i),
    ).toBeVisible();
    await expect(main.getByText(/No real payments are taken/i)).toBeVisible();
    await expect(main.getByText(/do not enter personal information/i)).toBeVisible();

    const signIn = main.getByRole("link", { name: /^Sign in/ });
    await expect(signIn).toHaveCount(2);
    for (const link of await signIn.all()) {
      await expect(link).toHaveAttribute("href", "/login");
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(main.getByRole("link", { name: "About this demo" })).toHaveAttribute(
      "href",
      "/about-demo",
    );
  });

  test("the About page and this page show the same customer account", async ({
    page,
  }) => {
    await open(page, 1440, "/about-demo");
    const about = await page.locator("main").innerText();
    expect(about).toContain(CUSTOMER_EMAIL);
    expect(about).toContain(PASSWORD);
    expect(about, "the admin account is only on this page").not.toContain(ADMIN_EMAIL);
  });

  test("is kept out of search results and out of the sitemap", async ({
    page,
    request,
  }) => {
    await open(page, 1440);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );

    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).not.toContain("demo-accounts");
  });

  test("never scrolls sideways", async ({ page }) => {
    for (const width of [320, 390, 768, 1280, 1920]) {
      await open(page, width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${width}px`,
      ).toBeLessThanOrEqual(width);
    }
  });
});

test.describe("the copy buttons", () => {
  test("copy the text and show Copied", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page, 1440);

    const button = page.getByRole("button", { name: "Copy customer email" });
    await button.click();
    await expect(button).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      CUSTOMER_EMAIL,
    );
    // It goes back by itself.
    await expect(button).toHaveText("Copy");

    await page.getByRole("button", { name: "Copy admin password" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PASSWORD);
  });

  test("fail quietly when the browser has no clipboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: undefined });
    });
    await open(page, 1440);

    const button = page.getByRole("button", { name: "Copy admin email" });
    await button.click();
    await expect(button).toHaveText("Copy");
    expect(errors).toEqual([]);
    // The text is still there to select by hand.
    await expect(page.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
  });

  test("are big enough to tap and keyboard reachable", async ({ page }) => {
    await open(page, 390);
    const buttons = page.getByRole("button", { name: /^Copy / });
    await expect(buttons).toHaveCount(4);
    for (const button of await buttons.all()) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }
    await buttons.first().focus();
    await expect(buttons.first()).toBeFocused();
  });
});

test.describe("the link in the top bar", () => {
  test("is the last item of the header actions, leads to the page and marks it as current", async ({
    page,
  }) => {
    await open(page, 1440, "/");
    const link = headerLink(page);
    await expect(link).toBeVisible();
    await expect(link).not.toHaveAttribute("aria-current", /.+/);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Not on the left any more: the logo is the first item.
    const parts = await headerItems(page);
    expect(parts[0].name).toBe("logo");

    await link.click();
    await expect(page).toHaveURL(/\/demo-accounts$/);
    await expect(page.locator("h1")).toHaveText("Demo accounts");
    await expect(headerLink(page)).toHaveAttribute("aria-current", "page");
  });

  test("can be reached and used with the keyboard, with a visible focus ring", async ({
    page,
  }) => {
    await open(page, 1440, "/");
    const link = headerLink(page);
    await link.focus();
    await expect(link).toBeFocused();
    const outline = await link.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(2);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/demo-accounts$/);
  });

  test("is in the menu drawer on a phone, not in the bar", async ({ page }) => {
    await open(page, 390, "/");
    await expect(headerLink(page)).toBeHidden();

    await page.getByRole("button", { name: "Open mobile navigation menu" }).click();
    const drawer = page.getByRole("dialog");
    const link = drawer.getByRole("link", { name: /Demo accounts/ });
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await link.click();
    await expect(page).toHaveURL(/\/demo-accounts$/);
    await expect(page.locator("h1")).toHaveText("Demo accounts");
    await expect(drawer).toBeHidden();

    await page.getByRole("button", { name: "Open mobile navigation menu" }).click();
    await expect(
      page.getByRole("dialog").getByRole("link", { name: /Demo accounts/ }),
    ).toHaveAttribute("aria-current", "page");
  });

  // The header's items, left to right, with where they sit.
  async function headerItems(page: Page) {
    const header = page.locator("header");
    const candidates: Record<string, Locator> = {
      logo: header.getByRole("link", { name: /VERVE\s*STUDIO/ }),
      menu: header.getByRole("navigation", { name: "Store navigation" }),
      search: header.locator('input[name="q"]#desktop-header-search-input'),
      wishlist: header.getByRole("link", { name: "View saved wishlist items" }),
      cart: header.getByRole("link", { name: "View shopping cart" }),
      admin: header.getByRole("link", { name: "Admin", exact: true }),
      "sign in": header.getByRole("link", { name: "Sign In" }),
      register: header.getByRole("link", { name: "Register" }),
      account: header.getByRole("link", { name: "View account profile" }),
      "sign out": header.getByRole("button", { name: "Sign Out" }),
      "demo accounts": headerLink(page),
    };
    const items: Array<{ name: string; x: number; right: number; width: number }> = [];
    for (const [name, locator] of Object.entries(candidates)) {
      if (!(await locator.isVisible())) continue;
      const box = (await locator.boundingBox())!;
      items.push({ name, x: box.x, right: box.x + box.width, width: box.width });
    }
    return items.sort((a, b) => a.x - b.x);
  }

  // Nothing in the header may overlap, wrap, leave the screen or push the page
  // sideways, and the link stays visible as the last item.
  async function expectHeaderFits(page: Page, width: number, order: string[]) {
    await page.evaluate(() => document.fonts.ready);
    const items = await headerItems(page);
    const label = `${width}px`;

    expect(items.map((item) => item.name), `order at ${label}`).toEqual(order);
    for (let index = 1; index < items.length; index += 1) {
      expect(
        items[index].x,
        `${items[index - 1].name} runs into ${items[index].name} at ${label}`,
      ).toBeGreaterThanOrEqual(items[index - 1].right - 0.5);
    }
    expect(items.at(-1)!.right, `inside the screen at ${label}`).toBeLessThanOrEqual(width);
    expect(
      items.find((item) => item.name === "search")!.width,
      `the search box stays usable at ${label}`,
    ).toBeGreaterThanOrEqual(128);

    // Free room in the row: what the category menu's slot has left once the menu
    // is in it (negative = the menu spills over its neighbours). Fonts are a bit
    // wider on Linux than on Windows, so a header that only just fits here would
    // overlap there; this margin catches that on any machine.
    if (width >= 1280) {
      const slack = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Store navigation"]')!;
        return (
          nav.parentElement!.getBoundingClientRect().width -
          nav.getBoundingClientRect().width
        );
      });
      expect(
        slack,
        `free room in the header row at ${label}: ${slack.toFixed(1)}px (needs at least ${MIN_SLACK}px)`,
      ).toBeGreaterThanOrEqual(MIN_SLACK);
    }

    const wrapped = await page.evaluate(() => {
      const lines = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return new Set(
          Array.from(range.getClientRects(), (rect) => Math.round(rect.top)),
        ).size;
      };
      return Array.from(
        document.querySelectorAll("header a:not(:has(> span)), header button"),
      )
        .filter((element) => element.getClientRects().length > 0)
        .filter((element) => lines(element) > 1)
        .map((element) => element.textContent?.trim());
    });
    expect(wrapped, `links that wrap at ${label}`).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `page width at ${label}`,
    ).toBeLessThanOrEqual(width);
  }

  const MIN_SLACK = 16;
  const WIDTHS = [768, 1024, 1280, 1440, 1920];
  // From 1280px the category menu sits between the logo and the search.
  const leftOf = (width: number) =>
    width >= 1280 ? ["logo", "menu", "search"] : ["logo", "search"];

  for (const width of WIDTHS) {
    test(`guest: Demo accounts comes right after Register at ${width}px, nothing overlaps`, async ({
      page,
    }) => {
      await open(page, width, "/");
      await expectHeaderFits(page, width, [
        ...leftOf(width),
        "wishlist",
        "cart",
        "sign in",
        "register",
        "demo accounts",
      ]);
    });

    test(`customer: Demo accounts is the last item at ${width}px, nothing overlaps`, async ({
      page,
    }) => {
      await signIn(page, CUSTOMER);
      await open(page, width, "/");
      await expectHeaderFits(page, width, [
        ...leftOf(width),
        "wishlist",
        "cart",
        "account",
        "sign out",
        "demo accounts",
      ]);
    });

    test(`admin: Demo accounts is the last item at ${width}px, nothing overlaps`, async ({
      page,
    }) => {
      await signIn(page, OTHER_USER);
      await open(page, width, "/");
      await expectHeaderFits(page, width, [
        ...leftOf(width),
        "wishlist",
        "cart",
        "admin",
        "account",
        "sign out",
        "demo accounts",
      ]);
    });
  }
});
