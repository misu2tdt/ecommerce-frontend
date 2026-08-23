import { expect, test } from "@playwright/test";

const DEMO_PASSWORD = "DemoOnly!2026";

test("public catalog opens a real Product", async ({ page }) => {
  await page.goto("/products");
  await expect(
    page.getByRole("heading", { name: "Find your next device" }),
  ).toBeVisible();

  const product = page.locator('main a[href^="/products/"]').first();
  await expect(product).toBeVisible();
  await product.click();

  await expect(page).toHaveURL(/\/products\/[^/?]+/);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByText("Choose a variant")).toBeVisible();
});

test("customer protection redirects and denies ADMIN access", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);

  await page.getByLabel("Email address").fill("demo.customer@example.com");
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "ADMIN access required" }),
  ).toBeVisible();
});

test("verified ADMIN reaches administration", async ({ page }) => {
  await page.goto("/login?next=%2Fadmin");
  await page.getByLabel("Email address").fill("demo.admin@example.com");
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Catalog administration" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin sections" }),
  ).toBeVisible();
});
