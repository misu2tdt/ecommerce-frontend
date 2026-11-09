import { expect, test, type Locator, type Page } from "@playwright/test";
import { skipProductPhotos } from "./support/shop";

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
  test("sits left of the logo on desktop, leads to the page and marks it as current", async ({
    page,
  }) => {
    await open(page, 1440, "/");
    const link = headerLink(page);
    const logo = page.locator("header").getByRole("link", { name: /VERVE\s*STUDIO/ });
    await expect(link).toBeVisible();
    await expect(link).not.toHaveAttribute("aria-current", /.+/);

    const [linkBox, logoBox] = [(await link.boundingBox())!, (await logo.boundingBox())!];
    expect(linkBox.x + linkBox.width, "left of the logo").toBeLessThanOrEqual(logoBox.x);
    expect(linkBox.height).toBeGreaterThanOrEqual(44);

    await link.click();
    await expect(page).toHaveURL(/\/demo-accounts$/);
    await expect(page.locator("h1")).toHaveText("Demo accounts");
    await expect(headerLink(page)).toHaveAttribute("aria-current", "page");
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

  test("is in the bar on a tablet too", async ({ page }) => {
    await open(page, 768, "/");
    await expect(headerLink(page)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(768);
  });

  // The header needs the most room from 1280px. Nothing in it may overlap, wrap
  // or push the page sideways, and the link stays visible.
  for (const width of [1280, 1366, 1440, 1920]) {
    test(`nothing in the header overlaps or wraps at ${width}px`, async ({ page }) => {
      await open(page, width, "/");
      await page.evaluate(() => document.fonts.ready);
      const header = page.locator("header");

      const parts: Record<string, Locator> = {
        "demo accounts": headerLink(page),
        logo: header.getByRole("link", { name: /VERVE\s*STUDIO/ }),
        menu: header.getByRole("navigation", { name: "Store navigation" }),
        search: header.locator('input[name="q"]#desktop-header-search-input'),
        wishlist: header.getByRole("link", { name: "View saved wishlist items" }),
        cart: header.getByRole("link", { name: "View shopping cart" }),
        "sign in": header.getByRole("link", { name: "Sign In" }),
        register: header.getByRole("link", { name: "Register" }),
      };
      const boxes: Array<{ name: string; x: number; right: number }> = [];
      for (const [name, locator] of Object.entries(parts)) {
        await expect(locator, name).toBeVisible();
        const box = (await locator.boundingBox())!;
        boxes.push({ name, x: box.x, right: box.x + box.width });
      }

      const ordered = boxes.sort((a, b) => a.x - b.x);
      for (let index = 1; index < ordered.length; index += 1) {
        expect(
          ordered[index].x,
          `${ordered[index - 1].name} runs into ${ordered[index].name}`,
        ).toBeGreaterThanOrEqual(ordered[index - 1].right - 0.5);
      }
      expect(ordered.at(-1)!.right, "inside the screen").toBeLessThanOrEqual(width);

      const wrapped = await page.evaluate(() => {
        const lines = (element: Element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return new Set(
            Array.from(range.getClientRects(), (rect) => Math.round(rect.top)),
          ).size;
        };
        return Array.from(document.querySelectorAll("header a:not(:has(> span))"))
          .filter((element) => element.getClientRects().length > 0)
          .filter((element) => lines(element) > 1)
          .map((element) => element.textContent?.trim());
      });
      expect(wrapped, "links that wrap").toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    });
  }
});
