import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  API_URL,
  apiLogin,
  CUSTOMER,
  OTHER_USER,
  signIn,
  skipProductPhotos,
} from "./support/shop";

// Collections against the real seeded backend. The backend's test seed has two
// collections: "Everyday Essentials" (featured, 7 products) and "Layering Pieces"
// (7 products). Tests that change a collection put it back; the one collection
// the admin test creates is inactive again before that test ends, so it never
// shows on the home page or in the menus of another test.

const SITE = "http://localhost:3001";
const FEATURED = { slug: "everyday-essentials", name: "Everyday Essentials" };
const OTHER = { slug: "layering-pieces", name: "Layering Pieces" };

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

interface ApiCollection {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
  isFeatured: boolean;
  productCount: number;
}
interface ApiProduct {
  id: number;
  name: string;
  slug: string;
}

async function openAt(page: Page, path: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

async function noSidewaysScroll(page: Page, width: number, label: string) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, `${label} at ${width}px`).toBeLessThanOrEqual(width);
}

// The collection's products as the backend orders them (no sort: its own order).
async function apiProducts(request: APIRequestContext, query: string): Promise<ApiProduct[]> {
  const response = await request.get(`${API_URL}/products?${query}`);
  expect(response.ok(), `GET /products?${query}`).toBe(true);
  return (await response.json()) as ApiProduct[];
}

// The product pages linked from the cards inside `scope`, one entry per card.
async function cardSlugs(scope: ReturnType<Page["locator"]>): Promise<string[]> {
  return scope
    .locator("article")
    .evaluateAll((cards) =>
      cards.map(
        (card) =>
          card.querySelector('a[href^="/products/"]')!.getAttribute("href")!.split("/products/")[1].split("?")[0],
      ),
    );
}

async function head(page: Page, path: string) {
  const response = await page.goto(path);
  const meta = await page.evaluate(() => ({
    title: document.title,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => script.textContent ?? "",
    ),
  }));
  return { status: response!.status(), ...meta };
}

// Staff requests straight to the backend, for set-up and for putting things back.
async function adminApi(request: APIRequestContext) {
  const headers = { Authorization: `Bearer ${await apiLogin(request, OTHER_USER)}` };
  return {
    list: async () =>
      (await (await request.get(`${API_URL}/admin/collections`, { headers })).json()) as ApiCollection[],
    get: async (id: number) =>
      (await (await request.get(`${API_URL}/admin/collections/${id}`, { headers })).json()) as ApiCollection,
    patch: async (id: number, data: Record<string, unknown>) => {
      const response = await request.patch(`${API_URL}/admin/collections/${id}`, { headers, data });
      expect(response.ok(), `PATCH collection ${id}`).toBe(true);
    },
    create: async (data: Record<string, unknown>) => {
      const response = await request.post(`${API_URL}/admin/collections`, { headers, data });
      expect(response.ok(), "POST collection").toBe(true);
      return (await response.json()) as ApiCollection;
    },
    setProducts: async (id: number, productIds: number[]) => {
      const response = await request.put(`${API_URL}/admin/collections/${id}/products`, {
        headers,
        data: { productIds },
      });
      expect(response.ok(), `PUT products of ${id}`).toBe(true);
    },
    // A collection a test made must never stay visible to other tests.
    deactivate: async (id: number) => {
      const collection = await (
        await request.get(`${API_URL}/admin/collections/${id}`, { headers })
      ).json();
      if ((collection as ApiCollection).isActive) {
        await request.patch(`${API_URL}/admin/collections/${id}/toggle`, { headers });
      }
    },
  };
}

test.describe("the list of collections", () => {
  test("shows a card for every active collection, with its name, text and product count", async ({
    page,
    request,
  }) => {
    await openAt(page, "/collections", 1440);

    await expect(page.locator("h1")).toHaveText("Collections");
    const fromApi = (await (await request.get(`${API_URL}/collections`)).json()) as Array<{
      name: string;
      slug: string;
      description: string | null;
      productCount: number;
    }>;
    expect(fromApi.length).toBeGreaterThanOrEqual(2);

    const cards = page.locator("main article");
    await expect(cards).toHaveCount(fromApi.length);
    for (const [index, collection] of fromApi.entries()) {
      const card = cards.nth(index);
      await expect(card.getByRole("heading", { level: 2, name: collection.name })).toBeVisible();
      await expect(card.getByRole("link", { name: collection.name, exact: true })).toHaveAttribute(
        "href",
        `/collections/${collection.slug}`,
      );
      if (collection.description) await expect(card).toContainText(collection.description);
      await expect(card).toContainText(`${collection.productCount} products`);
    }
    // No picture was uploaded for the sample collections: a neutral placeholder, not a broken image.
    await expect(page.locator("main article img")).toHaveCount(0);
    await expect(page.getByText("temporarily unavailable")).toHaveCount(0);
  });

  test("a whole card is one link, and the page never scrolls sideways", async ({ page }) => {
    for (const width of [320, 390, 768, 1440, 1920]) {
      await openAt(page, "/collections", width);
      await noSidewaysScroll(page, width, "/collections");
    }

    await openAt(page, "/collections", 1440);
    const card = page.locator("main article").first();
    await expect(card.getByRole("link")).toHaveCount(1);
    const box = (await card.boundingBox())!;
    const link = (await card.getByRole("link").evaluate((element) => {
      const after = getComputedStyle(element, "::after");
      return { position: after.position, inset: after.inset };
    }));
    expect(box.width).toBeGreaterThan(200);
    expect(link.position).toBe("absolute");
  });

  test("has a title, a description and a canonical address, and can be indexed", async ({ page }) => {
    const first = await head(page, "/collections");
    expect(first.status).toBe(200);
    expect(first.title).toBe("Collections | VERVE STUDIO");
    expect(first.canonical).toBe(`${SITE}/collections`);
    expect(first.robots).toBeNull();

    // A page that is not a real page goes to one that is.
    await page.goto("/collections?page=2");
    await expect(page).toHaveURL(`${SITE}/collections`);
    await page.goto("/collections?page=abc");
    await expect(page).toHaveURL(`${SITE}/collections`);
  });
});

test.describe("a collection page", () => {
  test("shows its title, text and products in the collection's own order", async ({
    page,
    request,
  }) => {
    await openAt(page, `/collections/${FEATURED.slug}`, 1440);

    await expect(page.locator("h1")).toHaveText(FEATURED.name);
    // (The page also holds this text in its JSON-LD script, so look inside the header.)
    await expect(
      page.locator("main header").getByText("Simple pieces that go with everything"),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Collections" }),
    ).toHaveAttribute("href", "/collections");

    const expected = await apiProducts(request, `collection=${FEATURED.slug}`);
    expect(expected).toHaveLength(7);
    expect(await cardSlugs(page.locator("main"))).toEqual(expected.map((product) => product.slug));
    await expect(page.getByRole("status").filter({ hasText: "Showing 7 products" })).toBeVisible();
    // One page of 7: no pager.
    await expect(page.getByRole("navigation", { name: "Collection pages" })).toHaveCount(0);
  });

  test("the sort control re-orders the products and 'Default' returns to the collection's order", async ({
    page,
    request,
  }) => {
    await openAt(page, `/collections/${FEATURED.slug}`, 1440);
    const sort = page.getByLabel("Sort products by");

    await sort.selectOption("price_asc");
    await expect(page).toHaveURL(`${SITE}/collections/${FEATURED.slug}?sort=price_asc`);
    const cheapest = await apiProducts(request, `collection=${FEATURED.slug}&sort=price_asc`);
    await expect
      .poll(async () => cardSlugs(page.locator("main")))
      .toEqual(cheapest.map((product) => product.slug));

    await sort.selectOption("name_desc");
    await expect(page).toHaveURL(`${SITE}/collections/${FEATURED.slug}?sort=name_desc`);
    const byName = await apiProducts(request, `collection=${FEATURED.slug}&sort=name_desc`);
    await expect
      .poll(async () => cardSlugs(page.locator("main")))
      .toEqual(byName.map((product) => product.slug));

    await sort.selectOption("featured");
    await expect(page).toHaveURL(`${SITE}/collections/${FEATURED.slug}`);
    const own = await apiProducts(request, `collection=${FEATURED.slug}`);
    await expect
      .poll(async () => cardSlugs(page.locator("main")))
      .toEqual(own.map((product) => product.slug));
  });

  test("an address with sort=featured shows the collection's own order, not name order", async ({
    page,
    request,
  }) => {
    await openAt(page, `/collections/${FEATURED.slug}?sort=featured`, 1440);
    const own = await apiProducts(request, `collection=${FEATURED.slug}`);
    expect(await cardSlugs(page.locator("main"))).toEqual(own.map((product) => product.slug));
    // The default sort option is selected.
    await expect(page.getByLabel("Sort products by")).toHaveValue("featured");
  });

  test("never scrolls sideways from 320 to 1920px", async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await openAt(page, `/collections/${FEATURED.slug}`, width);
      await noSidewaysScroll(page, width, `/collections/${FEATURED.slug}`);
    }
  });

  test("has its own title and description, a canonical address and valid JSON-LD", async ({
    page,
    request,
  }) => {
    const meta = await head(page, `/collections/${FEATURED.slug}`);
    expect(meta.status).toBe(200);
    expect(meta.title).toBe("Everyday Essentials | VERVE STUDIO");
    expect(meta.canonical).toBe(`${SITE}/collections/${FEATURED.slug}`);
    expect(meta.robots).toBeNull();

    expect(meta.jsonLd).toHaveLength(1);
    const data = JSON.parse(meta.jsonLd[0]) as {
      "@type": string;
      name: string;
      url: string;
      mainEntity: { "@type": string; itemListElement: Array<{ position: number; url: string }> };
    };
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.name).toBe(FEATURED.name);
    expect(data.url).toBe(`${SITE}/collections/${FEATURED.slug}`);
    const products = await apiProducts(request, `collection=${FEATURED.slug}`);
    expect(data.mainEntity["@type"]).toBe("ItemList");
    expect(data.mainEntity.itemListElement.map((item) => item.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(data.mainEntity.itemListElement.map((item) => item.url)).toEqual(
      products.map((product) => `${SITE}/products/${product.slug}`),
    );
  });

  test("a page past the end, or one that is not a number, goes to page 1", async ({ page }) => {
    await page.goto(`/collections/${FEATURED.slug}?page=2`);
    await expect(page).toHaveURL(`${SITE}/collections/${FEATURED.slug}`);
    await page.goto(`/collections/${FEATURED.slug}?sort=price_asc&page=9`);
    await expect(page).toHaveURL(`${SITE}/collections/${FEATURED.slug}?sort=price_asc`);
    await page.goto(`/collections/${FEATURED.slug}?page=abc`);
    await expect(page).toHaveURL(`${SITE}/collections/${FEATURED.slug}`);
  });

  test("an unknown collection is a 404 that stays out of search results", async ({ page }) => {
    const meta = await head(page, "/collections/this-collection-does-not-exist");

    expect(meta.status).toBe(404);
    expect(meta.robots).toMatch(/noindex/);
    await expect(page.locator("h1")).toHaveText("Collection not found");
    await expect(page.getByRole("link", { name: "Browse all products" })).toBeVisible();
  });

  test("a long collection is paged 12 at a time, with its own canonical address on every page", async ({
    page,
    request,
  }) => {
    const api = await adminApi(request);
    const all = await apiProducts(request, "");
    expect(all.length).toBeGreaterThanOrEqual(14);
    const chosen = all.slice(0, 14);
    const created = await api.create({ name: `Paging check ${Date.now()}` });
    try {
      await api.setProducts(created.id, chosen.map((product) => product.id));
      const path = `/collections/${created.slug}`;

      const first = await head(page, path);
      expect(first.canonical).toBe(`${SITE}${path}`);
      expect(await cardSlugs(page.locator("main"))).toEqual(
        chosen.slice(0, 12).map((product) => product.slug),
      );
      const pager = page.getByRole("navigation", { name: "Collection pages" });
      await expect(pager).toBeVisible();
      await expect(page.getByRole("status").filter({ hasText: "Showing 1–12 of 14 products" })).toBeVisible();
      await expect(pager.getByRole("link", { name: "Next page" })).toHaveAttribute(
        "href",
        `${path}?page=2`,
      );

      const second = await head(page, `${path}?page=2`);
      expect(second.canonical).toBe(`${SITE}${path}?page=2`);
      expect(second.title).toContain(", page 2 | VERVE STUDIO");
      expect(await cardSlugs(page.locator("main"))).toEqual(
        chosen.slice(12).map((product) => product.slug),
      );
      await expect(pager.locator('[aria-current="page"]')).toHaveText("2");

      // Page 1 has one address: the pager's "Page 1" link has no page parameter.
      await expect(pager.getByRole("link", { name: "Page 1" })).toHaveAttribute("href", path);
      await page.goto(`${path}?page=3`);
      await expect(page).toHaveURL(`${SITE}${path}?page=2`);
    } finally {
      await api.deactivate(created.id);
    }
  });
});

test.describe("the sitemap", () => {
  test("lists the collections page and every active collection, and nothing inactive", async ({
    request,
  }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
      match[1].replaceAll("&amp;", "&"),
    );

    expect(urls).toContain(`${SITE}/collections`);
    expect(urls).toContain(`${SITE}/collections/${FEATURED.slug}`);
    expect(urls).toContain(`${SITE}/collections/${OTHER.slug}`);
    expect(new Set(urls).size, "no address twice").toBe(urls.length);

    const active = (await (await request.get(`${API_URL}/collections`)).json()) as Array<{ slug: string }>;
    const collectionUrls = urls.filter((url) => /\/collections\/[^?]/.test(url)).sort();
    expect(collectionUrls).toEqual(active.map((entry) => `${SITE}/collections/${entry.slug}`).sort());
  });
});

test.describe("the home page", () => {
  test("shows the featured collection: its name, text, link and first products", async ({
    page,
    request,
  }) => {
    await openAt(page, "/", 1440);

    const section = page
      .locator("main section")
      .filter({ has: page.getByRole("heading", { level: 2, name: FEATURED.name }) });
    await expect(section).toHaveCount(1);
    await expect(section.getByText("Simple pieces that go with everything")).toBeVisible();
    await expect(section.getByRole("link", { name: /View collection/ })).toHaveAttribute(
      "href",
      `/collections/${FEATURED.slug}`,
    );

    // 7 products: the first 4 (complete rows of four), in the collection's order.
    const inCollection = await apiProducts(request, `collection=${FEATURED.slug}`);
    expect(inCollection).toHaveLength(7);
    expect(await cardSlugs(section)).toEqual(inCollection.slice(0, 4).map((product) => product.slug));

    // The second section has its own name and no product of the first.
    const second = page
      .locator("main section")
      .filter({ has: page.getByRole("heading", { level: 2, name: "Wardrobe Staples" }) });
    const secondSlugs = await cardSlugs(second);
    expect(secondSlugs).toHaveLength(8);
    for (const slug of await cardSlugs(section)) expect(secondSlugs).not.toContain(slug);
    await expect(page.getByRole("heading", { level: 2, name: "Featured Collection" })).toHaveCount(0);
  });

  test("with no featured collection it shows the earlier section: 8 catalog products", async ({
    page,
    request,
  }) => {
    const api = await adminApi(request);
    const seeded = (await api.list()).find((collection) => collection.slug === FEATURED.slug)!;
    expect(seeded.isFeatured).toBe(true);
    try {
      await api.patch(seeded.id, { isFeatured: false });
      await openAt(page, "/", 1440);

      const section = page
        .locator("main section")
        .filter({ has: page.getByRole("heading", { level: 2, name: "Featured Collection" }) });
      await expect(section).toHaveCount(1);
      await expect(section.locator("article")).toHaveCount(8);
      await expect(section.getByRole("link", { name: /View all products/ })).toHaveAttribute(
        "href",
        "/products",
      );
      // The second section keeps its original name when nothing else is called that.
      await expect(page.getByRole("heading", { level: 2, name: "Everyday Essentials" })).toBeVisible();
      await expect(page.getByText("temporarily unavailable")).toHaveCount(0);
      await expect(page.locator("main article")).toHaveCount(16);
    } finally {
      await api.patch(seeded.id, { isFeatured: true });
    }
    await openAt(page, "/", 1440);
    await expect(
      page.getByRole("link", { name: /View collection/ }),
    ).toHaveAttribute("href", `/collections/${FEATURED.slug}`);
  });
});

test.describe("navigation", () => {
  test("the header bar has no Collections item; the Shop All menu has one", async ({ page }) => {
    await openAt(page, "/", 1440);

    const bar = page.getByRole("navigation", { name: "Store navigation" });
    await expect(bar.getByRole("link", { name: "Collections" })).toHaveCount(0);

    await page.getByRole("link", { name: "Shop All", exact: true }).hover();
    const menu = page.getByRole("region", { name: "Shop categories and collections" });
    await expect(menu).toBeVisible();
    const entry = menu.getByRole("link", { name: /^Collections/ });
    await expect(entry).toHaveAttribute("href", "/collections");
    await entry.click();
    await expect(page).toHaveURL(`${SITE}/collections`);
  });

  test("the drawer and the footer list Collections on a phone", async ({ page }) => {
    await openAt(page, "/", 390, 844);

    await page.getByRole("button", { name: "Open mobile navigation menu" }).click();
    const drawer = page.getByRole("dialog");
    const entry = drawer.getByRole("link", { name: "Collections", exact: true });
    await expect(entry).toBeVisible();
    await expect(entry).toHaveAttribute("href", "/collections");
    expect((await entry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await entry.click();
    await expect(page).toHaveURL(`${SITE}/collections`);

    const footerLink = page.locator("footer").getByRole("link", { name: "Collections", exact: true });
    await expect(footerLink).toHaveAttribute("href", "/collections");
    expect((await footerLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("the footer lists Collections on a wide screen too", async ({ page }) => {
    await openAt(page, "/products", 1440);
    await expect(
      page.locator("footer").getByRole("link", { name: "Collections", exact: true }),
    ).toHaveAttribute("href", "/collections");
  });

  test("the staff navigation and dashboard know about collections", async ({ page, request }) => {
    await signIn(page, OTHER_USER);
    await openAt(page, "/admin", 1440);

    const nav = page.getByRole("navigation", { name: "Admin sections" });
    await expect(nav.getByRole("link", { name: "Collections" })).toHaveAttribute(
      "href",
      "/admin/collections",
    );
    const api = await adminApi(request);
    const total = (await api.list()).length;
    const card = page.getByRole("link", { name: /^Collections\s*\d+/ });
    await expect(card).toHaveAttribute("href", "/admin/collections");
    await expect(card).toContainText(String(total));
  });
});

test.describe("staff: collections", () => {
  test("lists every collection with its state, sort order and product count", async ({ page, request }) => {
    await signIn(page, OTHER_USER);
    await openAt(page, "/admin/collections", 1440);

    await expect(page.getByRole("heading", { level: 2, name: "Collections" })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: FEATURED.name });
    await expect(row).toContainText(`/${FEATURED.slug}`);
    await expect(row).toContainText("Active");
    await expect(row).toContainText("Featured");
    await expect(row.getByRole("cell").nth(2)).toHaveText("0");
    await expect(row.getByRole("cell").nth(3)).toContainText("7");

    const api = await adminApi(request);
    const all = await api.list();
    // The first page shows up to 20 rows.
    await expect(page.getByRole("row")).toHaveCount(Math.min(all.length, 20) + 1);
  });

  test("create a collection, choose and reorder its products, show it, hide it", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    const api = await adminApi(request);
    const name = `Smoke picks ${Date.now()}`;
    let id: number | null = null;

    try {
      await signIn(page, OTHER_USER);
      await openAt(page, "/admin/collections/new", 390);
      await noSidewaysScroll(page, 390, "/admin/collections/new");
      await openAt(page, "/admin/collections/new", 1440);

      // Create: the new collection opens with its product picker.
      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByLabel("Description").fill("Made by the smoke test.");
      await page.getByRole("button", { name: "Create collection" }).click();
      await expect(page).toHaveURL(/\/admin\/collections\/\d+\?created=1$/);
      id = Number(new URL(page.url()).pathname.split("/").pop());
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
      await expect(page.getByText("Collection created. Now choose its products below.")).toBeVisible();

      // A name that makes the same address is refused with a plain sentence.
      await page.goto("/admin/collections/new");
      await page.getByLabel("Name", { exact: true }).fill(name);
      await page.getByRole("button", { name: "Create collection" }).click();
      // (Next's route announcer is also an alert, so look inside the form.)
      const refusal = page.locator("main form").getByRole("alert");
      await expect(refusal).toContainText("already uses the address");
      await expect(refusal).not.toContainText("slug");
      await expect(page).toHaveURL(/\/admin\/collections\/new$/);
      await page.goto(`/admin/collections/${id}`);

      // Pick three products by searching, in this order: tee, tote, socks.
      const picked = [
        "Classic Crewneck Cotton Tee",
        "Heavy Canvas Daily Tote Bag",
        "Cushioned Cotton Crew Socks 3-Pack",
      ];
      const saveButton = page.getByRole("button", { name: "Save products" });
      await expect(saveButton).toBeDisabled();
      await expect(page.getByText("No products yet. Add some from the list.")).toBeVisible();

      await page.getByLabel("Search products").fill("tote");
      await expect(page.getByRole("button", { name: /^Add / })).toHaveCount(1);
      await page.getByRole("button", { name: `Add ${picked[1]}`, exact: true }).click();
      await page.getByLabel("Search products").fill("");
      await page.getByRole("button", { name: `Add ${picked[0]}`, exact: true }).click();
      await page.getByRole("button", { name: `Add ${picked[2]}`, exact: true }).click();
      await expect(page.getByText("You have unsaved changes.")).toBeVisible();

      const list = page.getByRole("list", { name: "Products in this collection" });
      await expect(list.getByRole("listitem")).toContainText([picked[1], picked[0], picked[2]]);
      // Added products leave the search results.
      await expect(page.getByRole("button", { name: `Add ${picked[0]}`, exact: true })).toHaveCount(0);

      // Reorder with the buttons: tee first, then socks up, then tee down.
      await expect(page.getByRole("button", { name: `Move up: ${picked[1]}`, exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: `Move down: ${picked[2]}`, exact: true })).toBeDisabled();
      await page.getByRole("button", { name: `Move up: ${picked[0]}`, exact: true }).click();
      await expect(list.getByRole("listitem")).toContainText([picked[0], picked[1], picked[2]]);
      await page.getByRole("button", { name: `Move up: ${picked[2]}`, exact: true }).click();
      await expect(list.getByRole("listitem")).toContainText([picked[0], picked[2], picked[1]]);
      await page.getByRole("button", { name: `Move down: ${picked[0]}`, exact: true }).click();
      await expect(list.getByRole("listitem")).toContainText([picked[2], picked[0], picked[1]]);
      await page.getByRole("button", { name: `Remove ${picked[1]}`, exact: true }).click();
      await expect(list.getByRole("listitem")).toHaveCount(2);
      await page.getByLabel("Search products").fill("tote");
      await page.getByRole("button", { name: `Add ${picked[1]}`, exact: true }).click();
      await expect(list.getByRole("listitem")).toContainText([picked[2], picked[0], picked[1]]);

      // Save: one message, and the order is what the backend now holds.
      await saveButton.click();
      await expect(page.getByRole("status").filter({ hasText: "Saved 3 products in this order." })).toBeVisible();
      await expect(saveButton).toBeDisabled();
      const saved = await apiProducts(request, `collection=${(await api.get(id)).slug}`);
      expect(saved.map((product) => product.name)).toEqual([picked[2], picked[0], picked[1]]);

      // The order survives a reload.
      await page.reload();
      await expect(
        page.getByRole("list", { name: "Products in this collection" }).getByRole("listitem"),
      ).toContainText([picked[2], picked[0], picked[1]]);

      // Public: it is listed, and its page shows the products in that order.
      const slug = (await api.get(id)).slug as string;
      await openAt(page, "/collections", 1440);
      const card = page.locator("main article").filter({ hasText: name });
      await expect(card).toContainText("3 products");
      await openAt(page, `/collections/${slug}`, 1440);
      await expect(page.locator("h1")).toHaveText(name);
      expect(await cardSlugs(page.locator("main"))).toEqual(saved.map((product) => product.slug));

      // Hide it: the public page is gone and the list no longer shows it.
      await page.goto(`/admin/collections/${id}`);
      await page.getByRole("button", { name: `Deactivate ${name}`, exact: true }).click();
      await expect(page.getByText("Inactive", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: `Activate ${name}`, exact: true })).toBeVisible();

      const hidden = await head(page, `/collections/${slug}`);
      expect(hidden.status).toBe(404);
      expect(hidden.robots).toMatch(/noindex/);
      await page.goto("/collections");
      await expect(page.getByText(name)).toHaveCount(0);
      const apiList = (await (await request.get(`${API_URL}/collections`)).json()) as ApiCollection[];
      expect(apiList.map((collection) => collection.slug)).not.toContain(slug);
      // Staff still see it, as inactive.
      await page.goto("/admin/collections");
      await expect(page.getByRole("row").filter({ hasText: name })).toContainText("Inactive");

      // Editing keeps working on an inactive collection, and the address stays when the name changes.
      await page.goto(`/admin/collections/${id}`);
      await page.getByLabel("Description").fill("Made by the smoke test, edited.");
      await page.getByRole("button", { name: "Save details" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Collection saved." })).toBeVisible();
      expect((await api.get(id)).slug).toBe(slug);
    } finally {
      if (id !== null) await api.deactivate(id);
    }
    // Whatever happened above, the collection is inactive now.
    if (id !== null) expect((await api.get(id)).isActive).toBe(false);
  });

  test("staff pages never scroll sideways from 390 to 1920px", async ({ page, request }) => {
    await signIn(page, OTHER_USER);
    const api = await adminApi(request);
    const seeded = (await api.list()).find((collection) => collection.slug === FEATURED.slug)!;

    for (const width of [390, 768, 1024, 1280, 1440, 1920]) {
      for (const path of [
        "/admin",
        "/admin/collections",
        "/admin/collections/new",
        `/admin/collections/${seeded.id}`,
      ]) {
        await openAt(page, path, width);
        await noSidewaysScroll(page, width, path);
      }
    }
  });

  test("an unknown collection id is a not-found page", async ({ page }) => {
    await signIn(page, OTHER_USER);
    await page.goto("/admin/collections/999999");
    await expect(page.getByText("Collection not found")).toBeVisible();
    await page.goto("/admin/collections/abc");
    await expect(page.getByText("Collection not found")).toBeVisible();
  });

  test("a customer is refused, and a visitor is sent to sign in", async ({ page }) => {
    await page.goto("/admin/collections");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);

    await signIn(page, CUSTOMER);
    await page.goto("/admin/collections");
    await expect(page.getByRole("heading", { name: "ADMIN access required" })).toBeVisible();
    await page.goto("/admin/collections/new");
    await expect(page.getByRole("heading", { name: "ADMIN access required" })).toBeVisible();
  });
});
