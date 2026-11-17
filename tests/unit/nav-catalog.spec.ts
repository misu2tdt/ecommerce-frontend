import { expect, test } from "@playwright/test";
import { loadNavCatalog } from "@/features/catalog/nav";
import {
  BASE_BRAND_SLUGS,
  BASE_CATEGORY_SLUGS,
  BRANDS,
  CATEGORIES,
  resolveNavCatalog,
} from "@/lib/catalog-nav";
import {
  MD_COLUMNS,
  cardsPerRow,
  categoryGridClasses,
  categoryGridPlan,
  rowsAreFull,
} from "@/lib/category-grid";
import { sitemapEntries, staticSitemapPaths } from "@/lib/seo";

const slugs = (items: readonly { slug: string }[]) =>
  items.map((item) => item.slug);
const rows = (slugList: string[]) => slugList.map((slug) => ({ slug }));

test.describe("resolveNavCatalog: only what the API has", () => {
  test("before the expansion is seeded: the five base categories and four brands", () => {
    const shown = resolveNavCatalog({
      categories: [...BASE_CATEGORY_SLUGS],
      brands: [...BASE_BRAND_SLUGS],
    });
    expect(slugs(shown.categories)).toEqual([
      "t-shirts-tops",
      "shirts-polos",
      "hoodies-outerwear",
      "pants-shorts",
      "basics-accessories",
    ]);
    expect(slugs(shown.brands)).toEqual([
      "aerothread",
      "kanso-basics",
      "veloce-active",
      "monolith-studio",
    ]);
  });

  test("after the expansion: seven categories and eight brands, in display order", () => {
    const shown = resolveNavCatalog({
      categories: [...BASE_CATEGORY_SLUGS, "activewear", "loungewear-sleepwear"],
      brands: [
        ...BASE_BRAND_SLUGS,
        "tidewell",
        "hushwell",
        "ardent-motion",
        "cinder-oak",
      ],
    });
    // The order is the page's own, not the order the API answered in.
    expect(slugs(shown.categories)).toEqual([
      "t-shirts-tops",
      "shirts-polos",
      "hoodies-outerwear",
      "pants-shorts",
      "activewear",
      "loungewear-sleepwear",
      "basics-accessories",
    ]);
    expect(shown.brands).toHaveLength(8);
    expect(slugs(shown.brands)).toEqual(slugs(BRANDS));
  });

  test("a category the API does not have is never offered, whatever the page knows about", () => {
    const shown = resolveNavCatalog({
      categories: ["t-shirts-tops", "activewear"],
      brands: ["aerothread"],
    });
    expect(slugs(shown.categories)).toEqual(["t-shirts-tops", "activewear"]);
    expect(slugs(shown.brands)).toEqual(["aerothread"]);
  });

  test("a category with no presentation here (an admin just made it) is left out", () => {
    const shown = resolveNavCatalog({
      categories: ["t-shirts-tops", "sale-rack"],
      brands: ["aerothread", "brand-new"],
    });
    expect(slugs(shown.categories)).toEqual(["t-shirts-tops"]);
    expect(slugs(shown.brands)).toEqual(["aerothread"]);
  });

  test("a failed lookup falls back to the base seed, each list on its own", () => {
    const fallbackCategories = resolveNavCatalog({
      categories: null,
      brands: ["aerothread"],
    });
    expect(slugs(fallbackCategories.categories)).toEqual([...BASE_CATEGORY_SLUGS]);
    expect(slugs(fallbackCategories.brands)).toEqual(["aerothread"]);

    const fallbackBrands = resolveNavCatalog({
      categories: ["activewear"],
      brands: null,
    });
    expect(slugs(fallbackBrands.categories)).toEqual(["activewear"]);
    expect(slugs(fallbackBrands.brands)).toEqual([...BASE_BRAND_SLUGS]);
  });

  test("an answer that is a real, empty list is respected: nothing is shown", () => {
    const shown = resolveNavCatalog({ categories: [], brands: [] });
    expect(shown.categories).toEqual([]);
    expect(shown.brands).toEqual([]);
  });

  test("the base slugs all have a presentation", () => {
    for (const slug of BASE_CATEGORY_SLUGS) {
      expect(slugs(CATEGORIES), slug).toContain(slug);
    }
    for (const slug of BASE_BRAND_SLUGS) {
      expect(slugs(BRANDS), slug).toContain(slug);
    }
  });
});

test.describe("loadNavCatalog", () => {
  test("reads the slugs of both answers", async () => {
    const shown = await loadNavCatalog({
      categories: async () => rows(["t-shirts-tops", "activewear"]),
      brands: async () => rows(["aerothread", "hushwell"]),
    });
    expect(slugs(shown.categories)).toEqual(["t-shirts-tops", "activewear"]);
    expect(slugs(shown.brands)).toEqual(["aerothread", "hushwell"]);
  });

  test("when the categories request fails the brands still come from the API", async () => {
    const shown = await loadNavCatalog({
      categories: async () => {
        throw new Error("503");
      },
      brands: async () => rows(["hushwell"]),
    });
    expect(slugs(shown.categories)).toEqual([...BASE_CATEGORY_SLUGS]);
    expect(slugs(shown.brands)).toEqual(["hushwell"]);
  });

  test("when the backend is down both lists are the base seed's", async () => {
    const down = async () => {
      throw new Error("down");
    };
    const shown = await loadNavCatalog({ categories: down, brands: down });
    expect(slugs(shown.categories)).toEqual([...BASE_CATEGORY_SLUGS]);
    expect(slugs(shown.brands)).toEqual([...BASE_BRAND_SLUGS]);
  });

  test("an answer that is not a list, or has rows without a slug, is not trusted", async () => {
    const shown = await loadNavCatalog({
      categories: async () => ({ message: "not a list" }),
      brands: async () => [{ name: "no slug" }, null, { slug: 7 }, { slug: "tidewell" }],
    });
    expect(slugs(shown.categories)).toEqual([...BASE_CATEGORY_SLUGS]);
    expect(slugs(shown.brands)).toEqual(["tidewell"]);
  });
});

test.describe("category grid plan: no row is left short", () => {
  for (const count of [1, 2, 3, 4, 5, 6, 7]) {
    test(`${count} categories fill every row at md and at lg`, () => {
      const plan = categoryGridPlan(count);
      expect(plan.mdSpans).toHaveLength(count);
      expect(plan.lgSpans).toHaveLength(count);
      expect(rowsAreFull(plan.mdSpans, MD_COLUMNS), "md").toBe(true);
      expect(rowsAreFull(plan.lgSpans, plan.lgColumns), "lg").toBe(true);
    });
  }

  test("five categories keep the layout they always had", () => {
    const plan = categoryGridPlan(5);
    expect(cardsPerRow(plan.mdSpans, MD_COLUMNS)).toEqual([3, 2]);
    expect(plan.lgColumns).toBe(5);
    expect(cardsPerRow(plan.lgSpans, plan.lgColumns)).toEqual([5]);
  });

  test("seven categories: rows of 2, 2 and 3 on a tablet; 4 and 3 on a desktop", () => {
    const plan = categoryGridPlan(7);
    expect(cardsPerRow(plan.mdSpans, MD_COLUMNS)).toEqual([2, 2, 3]);
    expect(cardsPerRow(plan.lgSpans, plan.lgColumns)).toEqual([4, 3]);
  });

  test("six categories: two rows of three at both widths", () => {
    const plan = categoryGridPlan(6);
    expect(cardsPerRow(plan.mdSpans, MD_COLUMNS)).toEqual([3, 3]);
    expect(cardsPerRow(plan.lgSpans, plan.lgColumns)).toEqual([3, 3]);
  });

  test("no category left alone in a row at tablet width for 2 to 7 categories", () => {
    for (const count of [2, 3, 4, 5, 6, 7]) {
      const plan = categoryGridPlan(count);
      for (const perRow of cardsPerRow(plan.mdSpans, MD_COLUMNS)) {
        expect(perRow, `${count} categories`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test("rowsAreFull notices a short last row", () => {
    expect(rowsAreFull([3, 3, 3], 6)).toBe(false);
    expect(rowsAreFull([2, 2, 2, 3], 6)).toBe(false);
    expect(rowsAreFull([4, 4], 6)).toBe(false);
    expect(rowsAreFull([3, 3, 6], 6)).toBe(true);
  });

  test("the classes are complete Tailwind class names, one set per card", () => {
    for (const count of [5, 6, 7]) {
      const classes = categoryGridClasses(count);
      expect(classes.list).toMatch(/^lg:grid-cols-\d+$/);
      expect(classes.items).toHaveLength(count);
      for (const item of classes.items) {
        expect(item).toMatch(/^md:col-span-\d lg:col-span-\d$/);
      }
    }
    expect(categoryGridClasses(5).list).toBe("lg:grid-cols-5");
    expect(categoryGridClasses(7).list).toBe("lg:grid-cols-12");
  });

  test("zero categories give an empty plan", () => {
    expect(categoryGridPlan(0).mdSpans).toEqual([]);
    expect(categoryGridClasses(0).items).toEqual([]);
  });
});

test.describe("sitemap lists only the categories and brands the shop has", () => {
  const SITE = "https://shop.example";

  test("with the base seed only, the new category and brand pages are left out", () => {
    const catalog = resolveNavCatalog({
      categories: [...BASE_CATEGORY_SLUGS],
      brands: [...BASE_BRAND_SLUGS],
    });
    const paths = staticSitemapPaths(catalog);
    expect(paths).toContain("/products?category=t-shirts-tops");
    expect(paths).toContain("/products?brand=aerothread");
    expect(paths).not.toContain("/products?category=activewear");
    expect(paths).not.toContain("/products?category=loungewear-sleepwear");
    expect(paths).not.toContain("/products?brand=tidewell");
    expect(paths.filter((path) => path.includes("category="))).toHaveLength(5);

    const urls = sitemapEntries(SITE, [], [], catalog).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("activewear"))).toBe(false);
  });

  test("after the expansion, they are listed", () => {
    const catalog = resolveNavCatalog({
      categories: CATEGORIES.map((item) => item.slug),
      brands: BRANDS.map((item) => item.slug),
    });
    const paths = staticSitemapPaths(catalog);
    expect(paths).toContain("/products?category=activewear");
    expect(paths).toContain("/products?category=loungewear-sleepwear");
    for (const brand of ["ardent-motion", "hushwell", "tidewell", "cinder-oak"]) {
      expect(paths).toContain(`/products?brand=${brand}`);
    }
    expect(paths.filter((path) => path.includes("category="))).toHaveLength(7);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
