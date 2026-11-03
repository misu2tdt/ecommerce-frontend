import { expect, test, type Page } from "@playwright/test";
import {
  addSocksToCart,
  API_URL,
  CUSTOMER,
  OTHER_USER,
  PASSWORD,
  placeOrder,
  signIn,
  skipProductPhotos,
} from "./support/shop";

// Phone ergonomics and robustness: the hero fits the first screen, no page
// touches the screen edge, links are big enough to tap, the menu behaves, and the
// header never pretends a signed-in visitor is signed out.

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

const PHONE_WIDTHS = [320, 360, 375, 390, 414];
const MIN_EDGE = 12;
const TOUCH = 44;

async function noHorizontalScroll(page: Page, width: number, label: string) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth, `${label} at ${width}px`).toBeLessThanOrEqual(width);
}

test.describe("home hero on phones", () => {
  for (const width of PHONE_WIDTHS) {
    test(`shows the picture as a 4:3 crop and the main button on the first screen at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/");

      const picture = page.locator("section", { has: page.locator("h1") }).first();
      const frame = picture.locator("img").first().locator("..");
      const box = (await frame.boundingBox())!;
      expect(box.width / box.height, "4:3 crop").toBeCloseTo(4 / 3, 1);

      const button = page.getByRole("link", { name: "Shop All Products" });
      const buttonBox = (await button.boundingBox())!;
      expect(buttonBox.y, "below the top").toBeGreaterThanOrEqual(0);
      expect(
        buttonBox.y + buttonBox.height,
        `the button ends inside the ${700}px screen`,
      ).toBeLessThanOrEqual(700);
      expect(buttonBox.height).toBeGreaterThanOrEqual(TOUCH);
      await noHorizontalScroll(page, width, "home");
    });
  }

  test("keeps the wider crop on a tablet and no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const frame = page.locator("main img").first().locator("..");
    const box = (await frame.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(3 / 2, 1);
    await noHorizontalScroll(page, 768, "home");
  });
});

test.describe("page padding", () => {
  // Visible text and controls inside main must stay clear of the screen edge.
  // A sideways-scrolling strip (the category carousel) bleeds on purpose.
  async function edgeViolations(page: Page, width: number) {
    return page.evaluate(
      ({ width, edge }) => {
        const found: string[] = [];
        const selector =
          "main :is(h1,h2,h3,p,label,button,input,select,textarea,a,dt,dd,li)";
        for (const element of document.querySelectorAll(selector)) {
          if (!(element as HTMLElement).checkVisibility()) continue;
          if (element.closest('[class*="overflow-x-auto"]')) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.left < edge - 0.5 || rect.right > width - edge + 0.5) {
            found.push(
              `${element.tagName.toLowerCase()} "${(element.textContent ?? "").trim().slice(0, 30)}" ${Math.round(rect.left)}..${Math.round(rect.right)}`,
            );
          }
        }
        return found.slice(0, 5);
      },
      { width, edge: MIN_EDGE },
    );
  }

  async function sweep(page: Page, paths: string[]) {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await edgeViolations(page, width), `${path} at ${width}px`).toEqual(
          [],
        );
        await noHorizontalScroll(page, width, path);
      }
    }
  }

  test("no customer page touches the screen edge on a phone", async ({ page }) => {
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);
    await addSocksToCart(page);

    await sweep(page, [
      "/",
      "/products",
      "/about-demo",
      "/cart",
      "/checkout",
      "/wishlist",
      "/account",
      "/account/orders",
      "/account/addresses",
      `/account/orders/${orderId}`,
      `/checkout/success/${orderId}`,
    ]);
  });

  test("the sign-in and register pages keep clear of the edge", async ({ page }) => {
    await sweep(page, ["/login", "/register"]);
  });

  test("admin pages keep clear of the edge", async ({ page }) => {
    await signIn(page, OTHER_USER);
    await sweep(page, ["/admin", "/admin/orders", "/admin/products"]);
  });
});

test.describe("touch targets on phones", () => {
  test("every footer link is at least 44px tall", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    const small = await page.evaluate((minimum) => {
      return [...document.querySelectorAll("footer a")]
        .map((link) => ({
          text: (link.textContent ?? "").trim().slice(0, 40),
          height: link.getBoundingClientRect().height,
        }))
        .filter((link) => link.height < minimum - 0.5);
    }, TOUCH);

    expect(small).toEqual([]);
  });

  // Links and buttons that stand on their own (not a link inside a sentence).
  async function smallTargets(page: Page) {
    return page.evaluate((minimum) => {
      return [...document.querySelectorAll("main a, main button")]
        .filter((element) => (element as HTMLElement).checkVisibility())
        .filter((element) => getComputedStyle(element).display !== "inline")
        .map((element) => ({
          text: (element.textContent ?? element.getAttribute("aria-label") ?? "").trim().slice(0, 40),
          height: Math.round(element.getBoundingClientRect().height),
        }))
        .filter((item) => item.height > 0 && item.height < minimum - 0.5);
    }, TOUCH);
  }

  test("links and buttons on the main pages are at least 44px tall on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signIn(page, CUSTOMER);
    const orderId = await placeOrder(page);
    await addSocksToCart(page);

    for (const path of [
      "/",
      "/products",
      "/products?category=t-shirts-tops",
      "/products/classic-crewneck-cotton-tee",
      "/about-demo",
      "/cart",
      "/checkout",
      "/account/orders",
      `/account/orders/${orderId}`,
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await smallTargets(page), path).toEqual([]);
    }
  });

  test("the menu drawer lists the shared categories and brands, with 44px targets", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open mobile navigation menu" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    for (const name of [
      "All Products",
      "T-Shirts & Tops",
      "Shirts & Polos",
      "Hoodies & Outerwear",
      "Pants & Shorts",
      "Basics & Accessories",
      "AeroThread",
      "Kanso Basics",
      "Veloce Active",
      "Monolith Studio",
    ]) {
      await expect(drawer.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    }
    const small = await drawer.evaluate((root, minimum) => {
      return [...root.querySelectorAll("a, button")]
        .filter((element) => (element as HTMLElement).checkVisibility())
        .map((element) => ({
          text: (element.textContent ?? element.getAttribute("aria-label") ?? "")
            .trim()
            .slice(0, 40),
          height: element.getBoundingClientRect().height,
        }))
        .filter((item) => item.height < minimum - 0.5);
    }, TOUCH);
    expect(small).toEqual([]);
  });
});

test.describe("header", () => {
  test("clicking Shop All goes to the catalog instead of closing the menu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const shopAll = page.getByRole("link", { name: "Shop All", exact: true });

    await shopAll.hover();
    await expect(
      page.getByRole("region", { name: "Shop categories and collections" }),
    ).toBeVisible();
    await shopAll.click();

    await expect(page).toHaveURL(/\/products$/);
  });

  test("no page has two elements with the same id", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/products", "/login", "/about-demo"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const duplicates = await page.evaluate(() => {
          const seen = new Map<string, number>();
          for (const element of document.querySelectorAll("[id]")) {
            seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
          }
          return [...seen].filter(([, count]) => count > 1).map(([id]) => id);
        });
        expect(duplicates, `${path} at ${width}px`).toEqual([]);
      }
    }
  });

  test("a signed-in visitor is not shown 'Sign In' when the session check is refused", async ({
    page,
    request,
  }) => {
    // A visitor of their own, so using up their allowance affects nobody else.
    const email = `header-check-${Date.now()}@example.test`;
    const registered = await request.post(`${API_URL}/users/register`, {
      data: { email, password: PASSWORD },
    });
    expect(registered.ok(), "registering the visitor").toBe(true);
    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email, password: PASSWORD },
    });
    const { access_token: token } = (await login.json()) as {
      access_token: string;
    };

    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, email);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "View account profile" })).toBeVisible();

    // Use up this visitor's allowance for the session check (a real 429).
    let refused = false;
    for (let attempt = 0; attempt < 700 && !refused; attempt += 1) {
      const response = await request.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refused = response.status() === 429;
    }
    expect(refused, "the backend refuses the check with 429").toBe(true);

    await page.goto("/");
    await expect(page.getByRole("link", { name: "View account profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Register" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
  });
});
