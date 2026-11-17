import { expect, test, type Page } from "@playwright/test";
import { signInAsAdmin } from "./support/reconciliation";
import { API_URL } from "./support/shop";

// The categories and brands that the menus, the footer, the home page and the
// sitemap show are the ones the API says exist. The test database holds only the
// base seed (5 categories, 4 brands); the catalog expansion adds 2 categories and
// 4 brands, and the page must be right before and after it is seeded.
//
//  - the first test checks the state the database is in: everything the API lacks
//    is absent everywhere, everything it has is present (so with the base seed:
//    5 categories and no Activewear or Loungewear & Sleepwear);
//  - the second creates the expansion's categories and brands in the admin, checks
//    the seven-category state, and deletes them again.

type Entry = readonly [slug: string, label: string];

// In the order the page shows them.
const CATEGORIES: readonly Entry[] = [
  ["t-shirts-tops", "T-Shirts & Tops"],
  ["shirts-polos", "Shirts & Polos"],
  ["hoodies-outerwear", "Hoodies & Outerwear"],
  ["pants-shorts", "Pants & Shorts"],
  ["activewear", "Activewear"],
  ["loungewear-sleepwear", "Loungewear & Sleepwear"],
  ["basics-accessories", "Basics & Accessories"],
];
const BASE_CATEGORY_SLUGS = [
  "t-shirts-tops",
  "shirts-polos",
  "hoodies-outerwear",
  "pants-shorts",
  "basics-accessories",
];
const NEW_CATEGORIES = CATEGORIES.filter(
  ([slug]) => !BASE_CATEGORY_SLUGS.includes(slug),
);

const BRANDS: readonly Entry[] = [
  ["aerothread", "AeroThread"],
  ["kanso-basics", "Kanso Basics"],
  ["veloce-active", "Veloce Active"],
  ["monolith-studio", "Monolith Studio"],
  ["ardent-motion", "Ardent Motion"],
  ["hushwell", "Hushwell"],
  ["tidewell", "Tidewell"],
  ["cinder-oak", "Cinder & Oak"],
];
const BASE_BRAND_SLUGS = [
  "aerothread",
  "kanso-basics",
  "veloce-active",
  "monolith-studio",
];
const NEW_BRANDS = BRANDS.filter(([slug]) => !BASE_BRAND_SLUGS.includes(slug));
// The brands that have a picture card on the home page.
const HOME_BRAND_SLUGS = [
  "veloce-active",
  "monolith-studio",
  "ardent-motion",
  "hushwell",
  "tidewell",
  "cinder-oak",
];

const categoryHref = (slug: string) => `/products?category=${slug}`;
const brandHref = (slug: string) => `/products?brand=${slug}`;

// Pictures are blocked: CI may be offline for external hosts, and nothing here
// depends on a picture arriving.
test.beforeEach(async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
});

async function openHome(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

async function hrefs(page: Page, selector: string): Promise<string[]> {
  return page
    .locator(selector)
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
}

// Cards per row of a list, by grouping the top edge of each item.
async function rowsOf(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).evaluateAll((items) => {
    const groups = new Map<number, number>();
    for (const item of items) {
      const top = Math.round(item.getBoundingClientRect().top);
      groups.set(top, (groups.get(top) ?? 0) + 1);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
  });
}

async function apiSlugs(
  page: Page,
  resource: "categories" | "brands",
): Promise<string[]> {
  const response = await page.request.get(`${API_URL}/${resource}`);
  expect(response.ok(), `GET /${resource}`).toBe(true);
  return ((await response.json()) as Array<{ slug: string }>).map(
    (row) => row.slug,
  );
}

async function sitemapPaths(page: Page): Promise<string[]> {
  const response = await page.request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname + new URL(match[1]).search,
  );
}

// Every place a category or brand link can be, read for one state of the shop.
// `categories` and `brands` are the slugs expected to be there, in display order.
async function expectShown(
  page: Page,
  categories: string[],
  brands: string[],
) {
  const categoryLinks = categories.map(categoryHref);
  const brandLinks = brands.map(brandHref);

  // Desktop: the home grid, the header bar, the mega menu, the footer.
  await openHome(page, 1440);
  expect(await hrefs(page, "#categories ul li a"), "home grid").toEqual(
    categoryLinks,
  );
  const bar = await hrefs(
    page,
    'nav[aria-label="Store navigation"] > a[href*="category="]',
  );
  expect(bar, "header bar keeps its three direct links").toEqual(
    categoryLinks.filter((href) =>
      ["t-shirts-tops", "shirts-polos", "hoodies-outerwear"].some(
        (slug) => href === categoryHref(slug),
      ),
    ),
  );
  expect(
    await hrefs(page, 'footer a[href*="category="]'),
    "footer categories",
  ).toEqual(categoryLinks);
  expect(await hrefs(page, 'footer a[href*="brand="]'), "footer brands").toEqual(
    brandLinks,
  );

  await page.getByRole("link", { name: "Shop All", exact: true }).hover();
  const menu = page.getByRole("region", {
    name: "Shop categories and collections",
  });
  await expect(menu).toBeVisible();
  const menuCategories = await menu
    .locator('a[href*="category="]')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(menuCategories, "mega menu categories").toEqual(categoryLinks);
  const menuBrands = await menu
    .locator('a[href*="brand="]')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(menuBrands, "mega menu brands").toEqual(brandLinks);

  // Phone: the drawer.
  await openHome(page, 390, 844);
  await page.getByRole("button", { name: "Open mobile navigation menu" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  const drawerCategories = await drawer
    .locator('a[href*="category="]')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(drawerCategories, "drawer categories").toEqual(categoryLinks);
  const drawerBrands = await drawer
    .locator('a[href*="brand="]')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  expect(drawerBrands, "drawer brands").toEqual(brandLinks);

  // The sitemap offers exactly these category and brand pages.
  const paths = await sitemapPaths(page);
  expect(
    paths.filter((path) => path.includes("category=")),
    "sitemap categories",
  ).toEqual(categoryLinks);
  expect(
    paths.filter((path) => path.includes("brand=")),
    "sitemap brands",
  ).toEqual(brandLinks);

  // Home brand cards: the ones with a picture that the shop has.
  await openHome(page, 1440);
  const cards = page
    .locator("main section")
    .filter({ has: page.getByRole("heading", { level: 2, name: "Brand Collections" }) })
    .locator("li h3 a");
  expect(
    await cards.evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
    "home brand cards",
  ).toEqual(
    brandLinks.filter((href) =>
      HOME_BRAND_SLUGS.some((slug) => href === brandHref(slug)),
    ),
  );
}

test("categories and brands that the API does not have are not shown anywhere, and the ones it has are", async ({
  page,
}) => {
  const categorySlugs = await apiSlugs(page, "categories");
  const brandSlugs = await apiSlugs(page, "brands");

  // The base seed is always there.
  for (const slug of BASE_CATEGORY_SLUGS) expect(categorySlugs).toContain(slug);
  for (const slug of BASE_BRAND_SLUGS) expect(brandSlugs).toContain(slug);

  const shownCategories = CATEGORIES.map(([slug]) => slug).filter((slug) =>
    categorySlugs.includes(slug),
  );
  const shownBrands = BRANDS.map(([slug]) => slug).filter((slug) =>
    brandSlugs.includes(slug),
  );
  const missing = [
    ...NEW_CATEGORIES.map(([slug]) => slug).filter((slug) => !categorySlugs.includes(slug)),
    ...NEW_BRANDS.map(([slug]) => slug).filter((slug) => !brandSlugs.includes(slug)),
  ];
  test.info().annotations.push({
    type: "not in the API (so not shown)",
    description: missing.join(", ") || "none: the expansion is seeded",
  });

  await expectShown(page, shownCategories, shownBrands);

  // What is missing from the API has no link anywhere on the home page or the
  // catalog, and no card.
  for (const path of ["/", "/products"]) {
    await page.goto(path);
    for (const slug of missing) {
      await expect(
        page.locator(`a[href*="category=${slug}"], a[href*="brand=${slug}"]`),
        `${slug} on ${path}`,
      ).toHaveCount(0);
    }
  }
  for (const [slug, label] of [...NEW_CATEGORIES, ...NEW_BRANDS]) {
    if (!missing.includes(slug)) continue;
    await openHome(page, 1440);
    await expect(
      page.locator("main").getByText(label, { exact: true }),
      `${label} on the home page`,
    ).toHaveCount(0);
  }

  // The five base categories sit in one row on a wide screen, and no card is
  // alone at tablet width (the layout the page had before the expansion).
  if (shownCategories.length === 5) {
    await openHome(page, 1440);
    expect(await rowsOf(page, "#categories ul > li")).toEqual([5]);
    await openHome(page, 768);
    expect(await rowsOf(page, "#categories ul > li")).toEqual([3, 2]);
  }
});

// ---- creating and removing the expansion through the admin pages -------------

type Resource = "category" | "brand";

// One category or brand this test tried to create. `confirmed` is set once the
// admin page said it was created; until then the item may or may not exist.
interface MadeItem {
  resource: Resource;
  name: string;
  confirmed: boolean;
}

const adminPath = (resource: Resource) =>
  resource === "category" ? "/admin/categories" : "/admin/brands";

// Opens an admin list and returns only once it has been drawn. The create form
// and the list are one component, so the form's heading shows up together with
// every item. `goto` alone is not enough: it returns on the load event, which can
// come before the page's content has streamed in.
async function openAdminList(page: Page, resource: Resource) {
  await page.goto(adminPath(resource));
  await expect(
    page.getByRole("heading", { name: `Create ${resource}` }),
    `the ${adminPath(resource)} page did not finish rendering`,
  ).toBeVisible({ timeout: 20_000 });
}

const itemOf = (page: Page, name: string) =>
  page.locator("details").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });

async function create(
  page: Page,
  made: MadeItem[],
  resource: Resource,
  name: string,
) {
  await openAdminList(page, resource);
  const form = page.locator("section").filter({
    has: page.getByRole("heading", { name: `Create ${resource}` }),
  });
  await form.getByLabel("Name").fill(name);
  // Listed before the click: if anything fails from here on, the cleanup still
  // looks for it.
  const item: MadeItem = { resource, name, confirmed: false };
  made.push(item);
  await form.getByRole("button", { name: `Create ${resource}` }).click();
  await expect(form.getByRole("status")).toContainText("created");
  item.confirmed = true;
}

// Deletes one item through the admin page, not the API, so the menus' short-lived
// list of what exists is refreshed as well. An item whose creation was confirmed
// MUST be found (after the list has rendered and a short wait): not finding it
// throws. An item whose creation never got confirmed may legitimately not exist.
async function removeItem(page: Page, entry: MadeItem) {
  const { resource, name } = entry;
  await openAdminList(page, resource);
  const item = itemOf(page, name);
  if (entry.confirmed) {
    try {
      await expect.poll(() => item.count(), { timeout: 10_000 }).toBe(1);
    } catch {
      throw new Error(
        `cleanup: the ${resource} "${name}" was created by this test but is not in the list on ${adminPath(resource)} (found ${await item.count()})`,
      );
    }
  } else if ((await item.count()) === 0) {
    return;
  }
  await item.locator("summary").click();
  page.once("dialog", (dialog) => void dialog.accept());
  await item.getByRole("button", { name: `Delete ${resource}` }).click();
  await expect(
    item,
    `the ${resource} "${name}" was not deleted`,
  ).toHaveCount(0, { timeout: 15_000 });
}

// Deletes everything the test attempted to create (newest first, every item even
// when one fails), then checks through the public API that only the base seed's
// categories and brands are left. Throws, naming what is wrong, if not.
async function cleanUp(page: Page, made: MadeItem[]) {
  const problems: string[] = [];
  for (const entry of [...made].reverse()) {
    try {
      await removeItem(page, entry);
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
  }

  const categories = [...(await apiSlugs(page, "categories"))].sort();
  const brands = [...(await apiSlugs(page, "brands"))].sort();
  const baseCategories = [...BASE_CATEGORY_SLUGS].sort();
  const baseBrands = [...BASE_BRAND_SLUGS].sort();
  if (JSON.stringify(categories) !== JSON.stringify(baseCategories)) {
    problems.push(
      `the database holds categories [${categories.join(", ")}] after the cleanup, expected only [${baseCategories.join(", ")}]`,
    );
  }
  if (JSON.stringify(brands) !== JSON.stringify(baseBrands)) {
    problems.push(
      `the database holds brands [${brands.join(", ")}] after the cleanup, expected only [${baseBrands.join(", ")}]`,
    );
  }
  if (problems.length > 0) {
    throw new Error(`cleanup left residue:\n- ${problems.join("\n- ")}`);
  }
}

test("when the expansion is created, seven categories and the new brands show at once, in balanced rows, and go again when deleted", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const categorySlugs = await apiSlugs(page, "categories");
  const brandSlugs = await apiSlugs(page, "brands");
  const present = [
    ...NEW_CATEGORIES.map(([slug]) => slug).filter((slug) => categorySlugs.includes(slug)),
    ...NEW_BRANDS.map(([slug]) => slug).filter((slug) => brandSlugs.includes(slug)),
  ];
  test.skip(
    present.length > 0,
    `the database already has ${present.join(", ")}: this test creates and deletes them, so it leaves real data alone`,
  );

  // Everything this test makes is listed here the moment it is attempted, so the
  // cleanup below covers a creation that fails half way too.
  const made: MadeItem[] = [];

  await signInAsAdmin(page);
  let bodyFailed = false;
  try {
    for (const [, label] of NEW_CATEGORIES) await create(page, made, "category", label);
    for (const [, label] of NEW_BRANDS) await create(page, made, "brand", label);

    const allCategories = CATEGORIES.map(([slug]) => slug);
    const allBrands = BRANDS.map(([slug]) => slug);
    await expectShown(page, allCategories, allBrands);

    // Seven categories: 4 and 3 on a desktop, 2 + 2 + 3 on a tablet, no card
    // alone in a row.
    for (const width of [1440, 1024]) {
      await openHome(page, width);
      expect(await rowsOf(page, "#categories ul > li"), `${width}px`).toEqual([4, 3]);
    }
    await openHome(page, 768);
    expect(await rowsOf(page, "#categories ul > li"), "768px").toEqual([2, 2, 3]);

    // Six brand cards: three rows of two on a wide screen.
    await openHome(page, 1440);
    const brandRows = await rowsOf(
      page,
      'main section:has(h2:text-is("Brand Collections")) ul > li',
    );
    expect(brandRows).toEqual([2, 2, 2]);

    // A phone scrolls the seven categories sideways; the page does not.
    await openHome(page, 390);
    const scroller = page.locator("#categories ul");
    await expect(scroller.getByRole("link")).toHaveCount(7);
    expect(
      await scroller.evaluate((element) => element.scrollWidth > element.clientWidth),
    ).toBe(true);
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await openHome(page, width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `page width at ${width}px`,
      ).toBeLessThanOrEqual(width);
    }
  } catch (error) {
    bodyFailed = true;
    throw error;
  } finally {
    // Runs whether the body passed or failed. When the body already failed, a
    // cleanup problem is printed and attached instead of hiding that failure.
    try {
      await cleanUp(page, made);
    } catch (cleanupError) {
      if (!bodyFailed) throw cleanupError;
      const text = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.error(`[nav-catalog] cleanup after a failed test also failed: ${text}`);
      test.info().annotations.push({ type: "cleanup failed", description: text });
    }
  }

  // Back to the base seed: the new ones are gone from every list.
  await expectShown(
    page,
    BASE_CATEGORY_SLUGS,
    BASE_BRAND_SLUGS,
  );
});
