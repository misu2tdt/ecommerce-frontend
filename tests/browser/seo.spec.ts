import { expect, test, type Page } from "@playwright/test";
import { API_URL, CUSTOMER, OTHER_USER, signIn, skipProductPhotos } from "./support/shop";

// What search engines and link previews see: robots.txt, the sitemap, a title and
// description per kind of page, canonical addresses, and noindex on private pages.
// No NEXT_PUBLIC_SITE_URL is set in the smoke run, so addresses use localhost.

const SITE = "http://localhost:3001";

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
});

async function head(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response!.status(), path).toBeLessThan(400);
  return page.evaluate(() => {
    const meta = (selector: string) =>
      document.querySelector(selector)?.getAttribute("content") ?? null;
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      robots: meta('meta[name="robots"]'),
      canonical:
        document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      ogTitle: meta('meta[property="og:title"]'),
      ogImage: meta('meta[property="og:image"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
        (script) => script.textContent ?? "",
      ),
    };
  });
}

test.describe("robots.txt and the sitemap", () => {
  test("robots.txt opens the shop, hides the private pages and names the sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const text = await response.text();

    expect(text).toMatch(/User-Agent: \*/i);
    expect(text).toMatch(/Allow: \//);
    for (const path of ["/account", "/admin", "/cart", "/checkout", "/login", "/register", "/wishlist", "/demo-pay", "/payment-return"]) {
      expect(text, path).toContain(`Disallow: ${path}`);
    }
    expect(text).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  test("the sitemap lists the fixed pages and every product, with absolute addresses", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/xml/);
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
      match[1].replaceAll("&amp;", "&"),
    );

    for (const path of ["/", "/products", "/about-demo", "/products?category=t-shirts-tops", "/products?brand=aerothread"]) {
      expect(urls, path).toContain(`${SITE}${path}`);
    }
    expect(new Set(urls).size, "no address twice").toBe(urls.length);
    for (const url of urls) {
      expect(url.startsWith(SITE), url).toBe(true);
      expect(url, "private pages stay out").not.toMatch(/\/(account|admin|cart|checkout|login|register|wishlist|demo-pay)/);
    }

    // One page for every product the backend has (it pages 12 or 48 at a time).
    const products = (await (await request.get(`${API_URL}/products`)).json()) as Array<{
      slug: string;
    }>;
    expect(products.length).toBeGreaterThan(12);
    const productUrls = urls.filter((url) => /\/products\/[^?]/.test(url));
    expect(productUrls.sort()).toEqual(
      products.map((product) => `${SITE}/products/${product.slug}`).sort(),
    );
  });
});

test.describe("titles, descriptions and canonical addresses", () => {
  test("each kind of page has its own title and description, with the site name once", async ({
    page,
    request,
  }) => {
    const [product] = (await (await request.get(`${API_URL}/products?limit=1`)).json()) as Array<{
      name: string;
      slug: string;
    }>;
    const pages: Record<string, string> = {
      home: "/",
      catalog: "/products",
      category: "/products?category=t-shirts-tops",
      brand: "/products?brand=aerothread",
      search: "/products?q=tee",
      product: `/products/${product.slug}`,
      about: "/about-demo",
    };

    const seen = new Map<string, string>();
    const descriptions = new Map<string, string>();
    for (const [name, path] of Object.entries(pages)) {
      const meta = await head(page, path);
      expect(meta.title.length, `${name} title`).toBeGreaterThan(5);
      expect(meta.title.match(/VERVE STUDIO/g)?.length, `${name} names the site once`).toBe(1);
      expect(meta.description, `${name} description`).toBeTruthy();
      expect(seen.get(meta.title), `${name} title is not shared`).toBeUndefined();
      seen.set(meta.title, name);
      descriptions.set(meta.description!, name);
    }
    expect(descriptions.size, "each page type has its own description").toBe(
      Object.keys(pages).length,
    );

    expect((await head(page, "/products?category=t-shirts-tops")).title).toBe(
      "T-Shirts & Tops | VERVE STUDIO",
    );
    expect((await head(page, "/products?q=tee")).title).toBe(
      'Search results for "tee" | VERVE STUDIO',
    );
    expect((await head(page, `/products/${product.slug}`)).title).toBe(
      `${product.name} | VERVE STUDIO`,
    );
  });

  test("the first catalog page has no page parameter in its canonical address, later pages do", async ({
    page,
  }) => {
    expect((await head(page, "/products")).canonical).toBe(`${SITE}/products`);
    expect((await head(page, "/products?page=1")).canonical).toBe(`${SITE}/products`);

    const second = await head(page, "/products?page=2");
    expect(second.canonical).toBe(`${SITE}/products?page=2`);
    expect(second.title).toBe("Shop all products, page 2 | VERVE STUDIO");

    expect((await head(page, "/products?category=pants-shorts")).canonical).toBe(
      `${SITE}/products?category=pants-shorts`,
    );
  });

  test("home and product pages carry a sharing preview made of real data", async ({
    page,
    request,
  }) => {
    const home = await head(page, "/");
    expect(home.ogImage).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(home.twitterCard).toBe("summary_large_image");
    expect(home.canonical).toMatch(/^http:\/\/localhost:3001\/?$/);

    const [product] = (await (await request.get(`${API_URL}/products?limit=1`)).json()) as Array<{
      name: string;
      slug: string;
      images: Array<{ url: string }>;
    }>;
    const meta = await head(page, `/products/${product.slug}`);
    expect(meta.ogTitle).toBe(product.name);
    expect(meta.canonical).toBe(`${SITE}/products/${product.slug}`);
    expect(meta.twitterCard).toBe(product.images.length > 0 ? "summary_large_image" : "summary");
    if (product.images.length > 0) {
      expect(meta.ogImage).toBe(product.images[0].url);
    }
  });

  test("public pages can be indexed", async ({ page }) => {
    for (const path of ["/", "/products", "/products?category=t-shirts-tops", "/about-demo"]) {
      expect((await head(page, path)).robots, path).toBeNull();
    }
  });
});

test.describe("private pages", () => {
  test("sign-in, register and the payment pages are noindex", async ({ page }) => {
    for (const path of ["/login", "/register"]) {
      expect((await head(page, path)).robots, path).toMatch(/noindex/);
    }
  });

  test("a signed-in customer's pages are noindex", async ({ page }) => {
    await signIn(page, CUSTOMER);
    for (const path of [
      "/cart",
      "/checkout",
      "/wishlist",
      "/account",
      "/account/orders",
      "/account/addresses",
      "/checkout/success/1",
      "/demo-pay/1",
      "/payment-return",
    ]) {
      const meta = await head(page, path);
      expect(meta.robots, `${path} (${page.url()})`).toMatch(/noindex/);
    }
  });

  test("the staff pages are noindex", async ({ page }) => {
    await signIn(page, OTHER_USER);
    for (const path of ["/admin", "/admin/orders", "/admin/products"]) {
      expect((await head(page, path)).robots, path).toMatch(/noindex/);
    }
  });

  test("a product that does not exist is noindex", async ({ page }) => {
    // The page streams (it has a loading state), so the status line is already
    // 200 when the product turns out not to exist. The page says so and stays
    // out of search results, which is what matters here.
    await page.goto("/products/this-product-does-not-exist");
    await expect(page.locator("h1")).toHaveCount(1);
    const robots = await page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
    );
    expect(robots).toMatch(/noindex/);
  });
});
