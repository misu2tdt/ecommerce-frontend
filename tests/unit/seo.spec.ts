import { expect, test } from "@playwright/test";
import robots from "@/app/robots";
import {
  absoluteUrl,
  catalogMetadata,
  collectionJsonLd,
  collectionMetadata,
  collectionsIndexMetadata,
  getSiteUrl,
  homeMetadata,
  noIndex,
  PRIVATE_PATHS,
  productMetadata,
  sitemapEntries,
  staticSitemapPaths,
} from "@/lib/seo";

const SITE = "https://shop.example.test";

test.describe("getSiteUrl", () => {
  test("prefers NEXT_PUBLIC_SITE_URL and drops a trailing slash", () => {
    expect(
      getSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://shop.example.test/",
        VERCEL_PROJECT_PRODUCTION_URL: "ignored.vercel.app",
      }),
    ).toBe("https://shop.example.test");
  });

  test("then uses the Vercel production host, which has no scheme", () => {
    expect(
      getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "ecommerce.vercel.app" }),
    ).toBe("https://ecommerce.vercel.app");
  });

  test("falls back to localhost for development", () => {
    expect(getSiteUrl({})).toBe("http://localhost:3001");
  });

  test("ignores blank or unusable values instead of crashing", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "  " })).toBe("http://localhost:3001");
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "not a url" })).toBe(
      "http://localhost:3001",
    );
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "ftp://files.test" })).toBe(
      "http://localhost:3001",
    );
  });
});

test.describe("absoluteUrl", () => {
  test("joins the site address and a path", () => {
    expect(absoluteUrl("/products?page=2", SITE)).toBe(
      "https://shop.example.test/products?page=2",
    );
    expect(absoluteUrl("/", SITE)).toBe("https://shop.example.test/");
  });
});

test.describe("catalogMetadata", () => {
  test("the whole catalog", () => {
    const meta = catalogMetadata({ filters: {}, page: 1 });

    expect(meta.title).toBe("Shop all products");
    expect(meta.description).toMatch(/catalog/i);
    expect(meta.alternates?.canonical).toBe("/products");
    expect(meta.robots).toBeUndefined();
  });

  test("a category and a brand are named by their label", () => {
    expect(catalogMetadata({ filters: { category: "t-shirts-tops" }, page: 1 }).title).toBe(
      "T-Shirts & Tops",
    );
    expect(catalogMetadata({ filters: { brand: "kanso-basics" }, page: 1 }).title).toBe(
      "Kanso Basics",
    );
  });

  test("a search names what was searched", () => {
    const meta = catalogMetadata({ filters: { q: "linen shirt" }, page: 1 });

    expect(meta.title).toBe('Search results for "linen shirt"');
    // A search result page is not worth indexing.
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  test("every page after the first says which page it is, with its own canonical", () => {
    const first = catalogMetadata({ filters: { category: "shirts-polos" }, page: 1 });
    const third = catalogMetadata({ filters: { category: "shirts-polos" }, page: 3 });

    expect(first.alternates?.canonical).toBe("/products?category=shirts-polos");
    expect(third.alternates?.canonical).toBe("/products?category=shirts-polos&page=3");
    expect(third.title).toBe("Shirts & Polos, page 3");
    expect(third.description).not.toBe(first.description);
  });

  test("an unknown category or brand slug does not invent a label", () => {
    expect(catalogMetadata({ filters: { category: "made-up" }, page: 1 }).title).toBe(
      "Shop all products",
    );
  });

  test("the title, description and canonical differ between page types", () => {
    const all = [
      catalogMetadata({ filters: {}, page: 1 }),
      catalogMetadata({ filters: { category: "pants-shorts" }, page: 1 }),
      catalogMetadata({ filters: { brand: "aerothread" }, page: 1 }),
      catalogMetadata({ filters: { q: "tee" }, page: 1 }),
    ];
    for (const field of ["title", "description"] as const) {
      expect(new Set(all.map((meta) => meta[field])).size).toBe(all.length);
    }
  });
});

test.describe("homeMetadata", () => {
  test("has its own description, canonical address and sharing preview", () => {
    const meta = homeMetadata();

    expect(meta.description).toMatch(/everyday fashion/i);
    expect(meta.alternates?.canonical).toBe("/");
    const images = meta.openGraph?.images as Array<{ url: string }>;
    expect(images).toHaveLength(1);
    expect(images[0].url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
    // The title comes from the site-wide default, so it is not set here.
    expect(meta.title).toBeUndefined();
  });
});

test.describe("productMetadata", () => {
  const product = {
    name: "Classic Crewneck Cotton Tee",
    slug: "classic-crewneck-cotton-tee",
    description: "Soft everyday cotton.",
    images: [
      { url: "https://res.cloudinary.com/x/a.jpg", altText: "Tee in Black" },
      { url: "https://res.cloudinary.com/x/b.jpg", altText: "Tee in White" },
    ],
  };

  test("uses the product's own name, text and first real photo", () => {
    const meta = productMetadata(product);

    expect(meta.title).toBe("Classic Crewneck Cotton Tee");
    expect(meta.description).toBe("Soft everyday cotton.");
    expect(meta.alternates?.canonical).toBe("/products/classic-crewneck-cotton-tee");
    expect(meta.openGraph?.images).toEqual([
      { url: "https://res.cloudinary.com/x/a.jpg", alt: "Tee in Black" },
    ]);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  test("a product without photos or text has no image and a plain description", () => {
    const meta = productMetadata({
      name: "Plain Tee",
      slug: "plain-tee",
      description: null,
      images: [],
    });

    expect(meta.openGraph?.images).toBeUndefined();
    expect(meta.twitter).toMatchObject({ card: "summary" });
    expect(meta.description).toBe("Plain Tee from VERVE STUDIO.");
  });
});

test.describe("collection metadata", () => {
  const collection = {
    name: "Everyday Essentials",
    slug: "everyday-essentials",
    description: "Simple pieces that go with everything.",
    heroImageUrl: null,
  };

  test("the list of collections has its own title, description and canonical address", () => {
    const first = collectionsIndexMetadata(1);
    const second = collectionsIndexMetadata(2);

    expect(first.title).toBe("Collections");
    expect(first.description).toMatch(/collections/i);
    expect(first.alternates?.canonical).toBe("/collections");
    expect(second.title).toBe("Collections, page 2");
    expect(second.alternates?.canonical).toBe("/collections?page=2");
    expect(second.description).not.toBe(first.description);
  });

  test("a collection page uses its own name and text, with no page parameter on page 1", () => {
    const first = collectionMetadata({ collection, sort: undefined, page: 1 });

    expect(first.title).toBe("Everyday Essentials");
    expect(first.description).toBe("Simple pieces that go with everything.");
    expect(first.alternates?.canonical).toBe("/collections/everyday-essentials");
    expect(first.robots).toBeUndefined();
  });

  test("later pages say which page they are and have their own canonical address", () => {
    const third = collectionMetadata({ collection, sort: "price_asc", page: 3 });

    expect(third.title).toBe("Everyday Essentials, page 3");
    expect(third.alternates?.canonical).toBe(
      "/collections/everyday-essentials?sort=price_asc&page=3",
    );
    expect(third.description).toBe("Simple pieces that go with everything. Page 3.");
  });

  test("without a description it says what the collection is, and never invents an image", () => {
    const meta = collectionMetadata({
      collection: { ...collection, description: null },
      sort: undefined,
      page: 1,
    });

    expect(meta.description).toBe("Shop the Everyday Essentials collection at VERVE STUDIO.");
    expect(meta.openGraph?.images).toBeUndefined();
    expect(meta.twitter).toMatchObject({ card: "summary" });
  });

  test("a cover picture becomes the sharing preview", () => {
    const meta = collectionMetadata({
      collection: { ...collection, heroImageUrl: "https://res.cloudinary.com/x/hero.jpg" },
      sort: undefined,
      page: 1,
    });

    expect(meta.openGraph?.images).toEqual([
      { url: "https://res.cloudinary.com/x/hero.jpg", alt: "Everyday Essentials" },
    ]);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

test.describe("collectionJsonLd", () => {
  test("is a CollectionPage with an ItemList of the products on the page", () => {
    const data = JSON.parse(
      collectionJsonLd(
        { name: "Everyday Essentials", slug: "everyday-essentials", description: "Simple pieces." },
        [
          { name: "Classic Tee", slug: "classic-tee" },
          { name: "Canvas Tote", slug: "canvas-tote" },
        ],
        13,
        SITE,
      ),
    );

    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Everyday Essentials",
      description: "Simple pieces.",
      url: `${SITE}/collections/everyday-essentials`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: [
          { "@type": "ListItem", position: 13, name: "Classic Tee", url: `${SITE}/products/classic-tee` },
          { "@type": "ListItem", position: 14, name: "Canvas Tote", url: `${SITE}/products/canvas-tote` },
        ],
      },
    });
  });

  test("leaves out a missing description and cannot close the script tag", () => {
    const text = collectionJsonLd(
      { name: "</script><b>", slug: "x", description: null },
      [],
      1,
      SITE,
    );

    expect(text).not.toContain("<");
    const data = JSON.parse(text);
    expect(data.name).toBe("</script><b>");
    expect(data).not.toHaveProperty("description");
    expect(data.mainEntity.itemListElement).toEqual([]);
  });
});

test.describe("noIndex", () => {
  test("keeps a page out of search results and does not follow its links", () => {
    expect(noIndex().robots).toEqual({ index: false, follow: false });
  });
});

test.describe("robots.txt", () => {
  test("allows the shop, hides the private pages and points to the sitemap", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual([...PRIVATE_PATHS]);
    for (const path of ["/account", "/admin", "/cart", "/checkout", "/login", "/register", "/demo-pay", "/wishlist", "/payment-return"]) {
      expect(rule.disallow, path).toContain(path);
    }
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

test.describe("sitemap", () => {
  test("lists the fixed pages once, with absolute addresses", () => {
    const paths = staticSitemapPaths();

    expect(paths).toContain("/");
    expect(paths).toContain("/products");
    expect(paths).toContain("/about-demo");
    expect(paths).toContain("/products?category=t-shirts-tops");
    expect(paths).toContain("/products?brand=aerothread");
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path, "private pages stay out").not.toMatch(/account|admin|cart|checkout|login/);
    }
  });

  test("adds every product page after the fixed ones", () => {
    const entries = sitemapEntries(SITE, [
      { slug: "a-tee", updatedAt: "2026-11-02T19:13:00.000Z" },
      { slug: "b-polo" },
    ]);

    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain(`${SITE}/`);
    expect(urls).toContain(`${SITE}/products/a-tee`);
    expect(urls).toContain(`${SITE}/products/b-polo`);
    expect(entries.find((entry) => entry.url.endsWith("/a-tee"))?.lastModified).toEqual(
      new Date("2026-11-02T19:13:00.000Z"),
    );
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("without products (the backend is down) it is still a sitemap of the fixed pages", () => {
    const entries = sitemapEntries(SITE, []);

    expect(entries.length).toBe(staticSitemapPaths().length);
    expect(entries.every((entry) => entry.url.startsWith(SITE))).toBe(true);
  });

  test("lists the collections page and every collection page when there are collections", () => {
    const entries = sitemapEntries(SITE, [{ slug: "a-tee" }], [
      { slug: "everyday-essentials" },
      { slug: "layering-pieces" },
    ]);

    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain(`${SITE}/collections`);
    expect(urls).toContain(`${SITE}/collections/everyday-essentials`);
    expect(urls).toContain(`${SITE}/collections/layering-pieces`);
    expect(urls).toContain(`${SITE}/products/a-tee`);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("with no collections (none exist, or the backend has none) they are left out", () => {
    const urls = sitemapEntries(SITE, [{ slug: "a-tee" }]).map((entry) => entry.url);

    expect(urls.some((url) => url.includes("/collections"))).toBe(false);
    expect(sitemapEntries(SITE, [], []).length).toBe(staticSitemapPaths().length);
  });

  test("encodes a slug so the address stays valid", () => {
    const entries = sitemapEntries(SITE, [{ slug: "tee & shorts" }]);

    expect(entries.map((entry) => entry.url)).toContain(
      `${SITE}/products/tee%20%26%20shorts`,
    );
  });
});
