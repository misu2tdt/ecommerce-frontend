import { expect, test, type Page } from "@playwright/test";

// The "About this demo" page is for recruiters and engineers. It is reachable
// from a small footer link only (not from the main navigation).

const FRONTEND_REPO = "https://github.com/misu2tdt/ecommerce-frontend";
const BACKEND_REPO = "https://github.com/misu2tdt/ecommerce-backend";

async function openAbout(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/about-demo");
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("the About page loads with one h1 and a page title", async ({ page }) => {
  await openAbout(page, 1440);

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("About this demo");
  await expect(page).toHaveTitle(/About this demo \| VERVE STUDIO/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /portfolio e-commerce project, not a real shop/i,
  );
});

test("headings follow the order h1 > h2 with no skipped level", async ({ page }) => {
  await openAbout(page, 1440);
  const levels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4")).map(
      (heading) => Number(heading.tagName.slice(1)),
    ),
  );

  expect(levels[0]).toBe(1);
  expect(levels.filter((level) => level === 2).length).toBeGreaterThanOrEqual(4);
  levels.forEach((level, index) => {
    if (index > 0) expect(level - levels[index - 1]).toBeLessThanOrEqual(1);
  });
});

test("it explains what the project is, how it is built and what the backend does", async ({
  page,
}) => {
  await openAbout(page, 1440);
  const main = page.locator("main");

  for (const heading of [
    "What this is",
    "How it is built",
    "Backend engineering highlights",
    "Source code",
  ]) {
    await expect(main.getByRole("heading", { level: 2, name: heading })).toBeVisible();
  }
  await expect(main.getByText("It is not a real shop")).toBeVisible();
  await expect(main.getByText("No real payments are taken")).toBeVisible();
  for (const stage of ["Browser", "Vercel", "Render", "Neon"]) {
    await expect(main.getByText(stage, { exact: true })).toBeVisible();
  }
  expect(await main.locator("section ul li").count()).toBeGreaterThanOrEqual(6);
});

test("it never shows admin credentials, a personal email or a phone number", async ({
  page,
}) => {
  await openAbout(page, 1440);
  const text = await page.locator("main").innerText();

  expect(text).not.toMatch(/demo\.admin/i);
  expect(text).not.toMatch(/\badmin\b.*password|password.*\badmin\b/i);
  const emails = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
  expect(emails).toEqual(["demo.customer@example.com"]);
  expect(text).not.toMatch(/\+?\d[\d\s().-]{8,}\d/);
});

test("both public repositories are linked and open in a new tab", async ({
  page,
}) => {
  await openAbout(page, 1440);
  const frontend = page.getByRole("link", { name: /Frontend on GitHub/ });
  const backend = page.getByRole("link", { name: /Backend on GitHub/ });

  await expect(frontend).toHaveAttribute("href", FRONTEND_REPO);
  await expect(backend).toHaveAttribute("href", BACKEND_REPO);
  for (const link of [frontend, backend]) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    const box = (await link.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test("the page never scrolls sideways", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await openAbout(page, width);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth, `page width at ${width}px`).toBeLessThanOrEqual(width);
  }
});

test("the footer links to it with a 44px target, and the main navigation does not", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const link = page
    .locator("footer")
    .getByRole("link", { name: "Portfolio demo store, not a real shop" });
  await expect(link).toHaveAttribute("href", "/about-demo");
  const box = (await link.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);

  await expect(
    page.locator("header").locator('a[href="/about-demo"]'),
  ).toHaveCount(0);
  await expect(page.locator("main").locator('a[href="/about-demo"]')).toHaveCount(0);

  await link.click();
  await expect(page).toHaveURL(/\/about-demo$/);
  await expect(page.locator("h1")).toHaveText("About this demo");
});

test("the footer line stays inside the screen on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const link = page
    .locator("footer")
    .getByRole("link", { name: "Portfolio demo store, not a real shop" });
  await link.scrollIntoViewIfNeeded();
  const box = (await link.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
