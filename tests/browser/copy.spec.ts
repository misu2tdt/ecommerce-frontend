import { expect, test, type Page } from "@playwright/test";

// Customer-facing copy must read like a shop, not like a code base. This scans
// what a shopper (or a screen reader) gets on the customer pages: the visible
// text, every aria-label, image alt, the page title and its description.
// The About page is exempt: it exists to talk about how the demo is built.

const BANNED: Array<[string, RegExp]> = [
  ["integer", /\binteger\b/i],
  ["deterministic", /\bdeterministic\b/i],
  ["variant-level", /\bvariant-level\b/i],
  ["idempotent", /\bidempoten(t|cy)\b/i],
  ["NestJS", /\bNest\.?js\b/i],
  ["Next.js", /\bNext\.js\b/i],
  ["Postgres", /\bPostgres(QL)?\b/i],
  ["API", /\bAPI\b/],
  ["seed", /\bseed(s|ed|ing)?\b/i],
  ["endpoint", /\bendpoints?\b/i],
  ["payload", /\bpayloads?\b/i],
  ["session", /\bsessions?\b/i],
  ["token", /\btokens?\b/i],
  ["demo data", /\bdemo data\b/i],
  ["backend", /\bback-?end\b/i],
  ["server-side", /\bserver-?side\b/i],
  ["provider", /\bprovider\b/i],
  ["IPN", /\bIPN\b/],
  ["authoritative", /\bauthoritative\b/i],
  ["authenticated", /\bauthenticated\b/i],
  ["lifecycle", /\blifecycle\b/i],
];

const DEMO_PASSWORD = "DemoOnly!2026";

async function pageText(page: Page) {
  return page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("[aria-label]")).map(
      (node) => node.getAttribute("aria-label") ?? "",
    );
    const alts = Array.from(document.querySelectorAll("img")).map(
      (node) => node.getAttribute("alt") ?? "",
    );
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ??
      "";
    return [document.body.innerText, ...labels, ...alts, document.title, description].join(
      "\n",
    );
  });
}

async function expectNoBannedTerms(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const text = await pageText(page);
  const found = BANNED.filter(([, pattern]) => pattern.test(text)).map(
    ([name]) => {
      const match = text.match(BANNED.find(([n]) => n === name)![1]);
      const at = match?.index ?? 0;
      return `"${name}" in ...${text.slice(Math.max(0, at - 30), at + 40).replace(/\s+/g, " ")}...`;
    },
  );
  expect(found, `${path}`).toEqual([]);
}

test("public pages use shopper language", async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());

  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ["/", "/products", "/login", "/register"]) {
    await expectNoBannedTerms(page, path);
  }

  // A product page: the first product in the catalog.
  await page.goto("/products");
  const href = await page
    .locator('main a[href^="/products/"]')
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();
  await expectNoBannedTerms(page, href!);
});

test("mobile layout (the announcement bar, drawer and footer) uses shopper language too", async ({
  page,
}) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoBannedTerms(page, "/");
});

test("signed-in pages use shopper language", async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/login?next=%2Faccount");
  await page.getByLabel("Email address").fill("demo.customer@example.com");
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);

  for (const path of [
    "/account",
    "/account/addresses",
    "/account/orders",
    "/cart",
    "/checkout",
    "/wishlist",
  ]) {
    await expectNoBannedTerms(page, path);
  }

  // One order page: it shows the order progress and the payment area.
  await page.goto("/account/orders");
  const orderHref = await page
    .locator('a[href^="/account/orders/"]')
    .first()
    .getAttribute("href");
  expect(orderHref, "the demo customer has an order").toBeTruthy();
  await expectNoBannedTerms(page, orderHref!);
});
