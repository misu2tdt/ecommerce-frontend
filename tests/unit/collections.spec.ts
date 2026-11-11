import { expect, test } from "@playwright/test";
import {
  getCollectionProducts,
  getCollectionsPage,
  getNavCollections,
} from "@/features/collections/api";
import {
  homeCollectionCardCount,
  HOME_SECTION_PRODUCTS,
  loadHomeFeatured,
  pickFeaturedCollection,
  secondSectionHeading,
} from "@/features/collections/home";
import { hasActiveCollections } from "@/features/collections/nav";
import {
  buildCollectionHref,
  buildCollectionsHref,
  collectionPath,
  parseCollectionSort,
} from "@/features/collections/search-params";
import { ApiError } from "@/lib/api";
import {
  COLLECTION_MAX_PRODUCTS,
  parseCollectionForm,
  parseProductIds,
} from "@/lib/collection-form";
import {
  addProduct,
  findPickable,
  moveProduct,
  removeProduct,
  sameOrder,
} from "@/lib/collection-order";
import { isHttpImageUrl, isOptimizableImageUrl } from "@/lib/image-url";
import type { ProductSummary } from "@/types/catalog";
import type { Collection } from "@/types/collections";

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 1,
    slug: "everyday-essentials",
    name: "Everyday Essentials",
    description: "Simple pieces.",
    heroImageUrl: null,
    isFeatured: true,
    productCount: 7,
    ...overrides,
  };
}

function products(count: number): ProductSummary[] {
  return Array.from({ length: count }, (_, index) => ({ id: index + 1 }) as ProductSummary);
}

test.describe("homeCollectionCardCount", () => {
  test("shows up to 8, rounded down to complete rows of four", () => {
    expect(HOME_SECTION_PRODUCTS).toBe(8);
    const shown = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 40].map(homeCollectionCardCount);
    expect(shown).toEqual([0, 1, 2, 3, 4, 4, 4, 4, 8, 8, 8, 8]);
  });

  test("7 products give 4 cards; fewer than 4 are all shown", () => {
    expect(homeCollectionCardCount(7)).toBe(4);
    expect(homeCollectionCardCount(3)).toBe(3);
  });

  test("never leaves a lone card in a row of four from 4 products up", () => {
    for (let available = 4; available <= 60; available += 1) {
      expect(homeCollectionCardCount(available) % 4, `${available} products`).toBe(0);
      expect(homeCollectionCardCount(available)).toBeLessThanOrEqual(available);
    }
  });
});

test.describe("the featured collection of the home page", () => {
  test("is the first collection marked as featured", () => {
    const list = [
      collection({ id: 1, slug: "a", isFeatured: false }),
      collection({ id: 2, slug: "b", isFeatured: true }),
      collection({ id: 3, slug: "c", isFeatured: true }),
    ];
    expect(pickFeaturedCollection(list)?.slug).toBe("b");
    expect(pickFeaturedCollection([])).toBeNull();
    expect(pickFeaturedCollection([collection({ isFeatured: false })])).toBeNull();
  });

  test("the second section keeps its name unless the featured collection has it", () => {
    expect(secondSectionHeading(null)).toBe("Everyday Essentials");
    expect(secondSectionHeading("Layering Pieces")).toBe("Everyday Essentials");
    expect(secondSectionHeading("Everyday Essentials")).toBe("Wardrobe Staples");
    expect(secondSectionHeading("  everyday essentials ")).toBe("Wardrobe Staples");
  });

  test("loads the featured collection's first products and rounds them down to rows", async () => {
    const asked: Array<[string, number]> = [];
    const logged: string[] = [];
    const featured = await loadHomeFeatured({
      getCollections: async () => [collection({ isFeatured: false, slug: "x" }), collection()],
      getCollectionProducts: async (slug, limit) => {
        asked.push([slug, limit]);
        return products(7);
      },
      logError: (message) => logged.push(message),
    });

    expect(asked).toEqual([["everyday-essentials", 8]]);
    expect(featured?.collection.slug).toBe("everyday-essentials");
    expect(featured?.products.map((product) => product.id)).toEqual([1, 2, 3, 4]);
    expect(logged).toEqual([]);
  });

  test("with no featured collection it falls back silently", async () => {
    const logged: string[] = [];
    const featured = await loadHomeFeatured({
      getCollections: async () => [collection({ isFeatured: false })],
      getCollectionProducts: async () => {
        throw new Error("must not be asked");
      },
      logError: (message) => logged.push(message),
    });

    expect(featured).toBeNull();
    expect(logged).toEqual([]);
  });

  test("a failed collections request falls back and logs once, with the status", async () => {
    for (const [error, status] of [
      [new ApiError("Cannot GET /collections", 404), "404"],
      [new ApiError("Too many requests", 429), "429"],
      [new ApiError("Service is temporarily unavailable.", 0), "0"],
      [new Error("boom"), "unknown"],
    ] as const) {
      const logged: string[] = [];
      const featured = await loadHomeFeatured({
        getCollections: async () => {
          throw error;
        },
        getCollectionProducts: async () => products(8),
        logError: (message) => logged.push(message),
      });

      expect(featured).toBeNull();
      expect(logged).toHaveLength(1);
      expect(logged[0]).toContain(`HTTP ${status}`);
      expect(logged[0]).toContain("could not load collections");
    }
  });

  test("a failed products request for the featured collection falls back and logs once", async () => {
    const logged: string[] = [];
    const featured = await loadHomeFeatured({
      getCollections: async () => [collection()],
      getCollectionProducts: async () => {
        throw new ApiError("Unable to complete the request.", 400);
      },
      logError: (message) => logged.push(message),
    });

    expect(featured).toBeNull();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toContain("HTTP 400");
  });

  test("a featured collection with no products falls back too", async () => {
    const featured = await loadHomeFeatured({
      getCollections: async () => [collection()],
      getCollectionProducts: async () => [],
      logError: () => undefined,
    });
    expect(featured).toBeNull();
  });
});

test.describe("hasActiveCollections (the menus' Collections entry)", () => {
  test("is true only when the shop has at least one collection", async () => {
    expect(await hasActiveCollections(async () => [collection()])).toBe(true);
    expect(await hasActiveCollections(async () => [])).toBe(false);
  });

  test("a failed lookup never throws and just leaves the entry out", async () => {
    expect(
      await hasActiveCollections(async () => {
        throw new ApiError("Not found", 404);
      }),
    ).toBe(false);
    expect(
      await hasActiveCollections(() => {
        throw new Error("synchronous failure");
      }),
    ).toBe(false);
  });
});

// Runs a call with fetch replaced and returns what it asked for.
async function requested(call: () => Promise<unknown>, headers: Record<string, string> = {}) {
  const originalFetch = globalThis.fetch;
  const originalBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
  let url: URL | undefined;
  let init: (RequestInit & { next?: unknown }) | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, options?: RequestInit) => {
    url = new URL(String(input));
    init = options;
    return new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json", ...headers },
    });
  }) as typeof fetch;
  try {
    await call();
  } finally {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalBase;
  }
  return { url: url!, init: init! };
}

test.describe("collection requests", () => {
  test("the grid asks for a page of 12", async () => {
    const { url } = await requested(() => getCollectionsPage(3));
    expect(url.pathname).toBe("/collections");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("limit")).toBe("12");
  });

  test("the home section asks for the collection's first 8 products", async () => {
    const { url } = await requested(() => getCollectionProducts("everyday-essentials", 8));
    expect(url.pathname).toBe("/products");
    expect(url.searchParams.get("collection")).toBe("everyday-essentials");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("8");
    // No sort: the collection's own order is wanted.
    expect(url.searchParams.has("sort")).toBe(false);
  });

  test("the menu lookup asks for one row and is cached for a few minutes", async () => {
    const { url, init } = await requested(() => getNavCollections());
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(init.cache).toBeUndefined();
    expect(init.next).toEqual({ revalidate: 300, tags: ["collections-nav"] });
  });

  test("every other request stays uncached", async () => {
    const { init } = await requested(() => getCollectionsPage(1));
    expect(init.cache).toBe("no-store");
  });
});

test.describe("collection addresses", () => {
  test("page 1 has no page parameter and the sort stays in the query", () => {
    expect(collectionPath("everyday-essentials")).toBe("/collections/everyday-essentials");
    expect(buildCollectionHref("a-b", undefined)).toBe("/collections/a-b");
    expect(buildCollectionHref("a-b", undefined, 1)).toBe("/collections/a-b");
    expect(buildCollectionHref("a-b", undefined, 2)).toBe("/collections/a-b?page=2");
    expect(buildCollectionHref("a-b", "price_asc", 1)).toBe("/collections/a-b?sort=price_asc");
    expect(buildCollectionHref("a-b", "price_asc", 3)).toBe(
      "/collections/a-b?sort=price_asc&page=3",
    );
    expect(buildCollectionsHref(1)).toBe("/collections");
    expect(buildCollectionsHref(2)).toBe("/collections?page=2");
  });

  test("a slug is encoded", () => {
    expect(collectionPath("a b/c")).toBe("/collections/a%20b%2Fc");
  });

  test("only known sorts count, and 'featured' means the collection's own order", () => {
    expect(parseCollectionSort("price_desc")).toBe("price_desc");
    expect(parseCollectionSort(["newest", "price_asc"])).toBe("newest");
    expect(parseCollectionSort("featured")).toBeUndefined();
    expect(parseCollectionSort("nonsense")).toBeUndefined();
    expect(parseCollectionSort("")).toBeUndefined();
    expect(parseCollectionSort(undefined)).toBeUndefined();
  });
});

test.describe("cover picture addresses", () => {
  test("only the shop's image host goes through the optimizer", () => {
    expect(isOptimizableImageUrl("https://res.cloudinary.com/x/a.jpg")).toBe(true);
    expect(isOptimizableImageUrl("http://res.cloudinary.com/x/a.jpg")).toBe(false);
    expect(isOptimizableImageUrl("https://images.example.test/a.jpg")).toBe(false);
    expect(isOptimizableImageUrl("not a url")).toBe(false);
  });

  test("only http and https addresses are pictures", () => {
    expect(isHttpImageUrl("https://images.example.test/a.jpg")).toBe(true);
    expect(isHttpImageUrl("http://images.example.test/a.jpg")).toBe(true);
    expect(isHttpImageUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpImageUrl("data:image/png;base64,AAAA")).toBe(false);
  });
});

function form(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

test.describe("parseCollectionForm", () => {
  test("create: leaves empty optional fields out and trims", () => {
    expect(parseCollectionForm(form({ name: "  Summer Picks  ", isActive: "on" }), "create")).toEqual({
      ok: true,
      input: { name: "Summer Picks", isFeatured: false, sortOrder: 0, isActive: true },
    });
  });

  test("create: sends every field that was filled in", () => {
    const result = parseCollectionForm(
      form({
        name: "Summer Picks",
        slug: " Summer-Picks ",
        description: " Light layers. ",
        heroImageUrl: "https://images.example.test/a.jpg",
        sortOrder: "5",
        isFeatured: "on",
      }),
      "create",
    );
    expect(result).toEqual({
      ok: true,
      input: {
        name: "Summer Picks",
        slug: "summer-picks",
        description: "Light layers.",
        heroImageUrl: "https://images.example.test/a.jpg",
        isFeatured: true,
        sortOrder: 5,
        isActive: false,
      },
    });
  });

  test("edit: empty description and cover picture clear them, an empty slug keeps the address", () => {
    expect(parseCollectionForm(form({ name: "Summer Picks" }), "edit")).toEqual({
      ok: true,
      input: {
        name: "Summer Picks",
        isFeatured: false,
        sortOrder: 0,
        description: null,
        heroImageUrl: null,
      },
    });
  });

  test("rejects what the backend would reject, in plain English", () => {
    const message = (values: Record<string, string>) => {
      const result = parseCollectionForm(form(values), "create");
      return result.ok ? null : result.message;
    };
    expect(message({ name: "A" })).toBe("Name must be between 2 and 120 characters.");
    expect(message({ name: "x".repeat(121) })).toBe("Name must be between 2 and 120 characters.");
    expect(message({})).toBe("Name must be between 2 and 120 characters.");
    expect(message({ name: "Ok", slug: "Not A Slug" })).toMatch(/lowercase letters and numbers/);
    expect(message({ name: "Ok", slug: "double--dash" })).toMatch(/lowercase letters and numbers/);
    expect(message({ name: "Ok", slug: "a".repeat(161) })).toMatch(/lowercase letters and numbers/);
    expect(message({ name: "Ok", description: "x".repeat(2001) })).toBe(
      "Description must be at most 2,000 characters.",
    );
    expect(message({ name: "Ok", heroImageUrl: "ftp://x.test/a.jpg" })).toBe(
      "The cover image must be a full http or https address.",
    );
    expect(message({ name: "Ok", heroImageUrl: "just words" })).toBe(
      "The cover image must be a full http or https address.",
    );
    expect(message({ name: "Ok", sortOrder: "-1" })).toBe(
      "Sort order must be a whole number from 0 to 100,000.",
    );
    expect(message({ name: "Ok", sortOrder: "1.5" })).toMatch(/whole number/);
    expect(message({ name: "Ok", sortOrder: "100001" })).toMatch(/whole number/);
  });
});

test.describe("parseProductIds", () => {
  test("accepts an ordered list of whole numbers, including an empty one", () => {
    expect(parseProductIds([12, 7, 31])).toEqual({ ok: true, ids: [12, 7, 31] });
    expect(parseProductIds([])).toEqual({ ok: true, ids: [] });
  });

  test("rejects repeats, bad ids and more than 200 products", () => {
    const failure = (value: unknown) => {
      const result = parseProductIds(value);
      return result.ok ? null : result.message;
    };
    expect(failure([1, 2, 1])).toMatch(/more than once/);
    expect(failure([1, 0])).toMatch(/invalid/);
    expect(failure([1.5])).toMatch(/invalid/);
    expect(failure(["1"])).toMatch(/invalid/);
    expect(failure("1,2")).toMatch(/invalid/);
    expect(failure(null)).toMatch(/invalid/);
    const tooMany = Array.from({ length: COLLECTION_MAX_PRODUCTS + 1 }, (_, i) => i + 1);
    expect(failure(tooMany)).toBe("A collection can hold at most 200 products.");
    expect(parseProductIds(tooMany.slice(0, COLLECTION_MAX_PRODUCTS)).ok).toBe(true);
  });
});

test.describe("the ordered product list", () => {
  test("add puts a product last and ignores one that is already there", () => {
    expect(addProduct([1, 2], 3)).toEqual([1, 2, 3]);
    expect(addProduct([1, 2], 1)).toEqual([1, 2]);
  });

  test("remove drops one product and keeps the order", () => {
    expect(removeProduct([1, 2, 3], 2)).toEqual([1, 3]);
    expect(removeProduct([1, 2, 3], 9)).toEqual([1, 2, 3]);
  });

  test("move swaps with the neighbour and stops at both ends", () => {
    expect(moveProduct([1, 2, 3], 2, "up")).toEqual([2, 1, 3]);
    expect(moveProduct([1, 2, 3], 2, "down")).toEqual([1, 3, 2]);
    expect(moveProduct([1, 2, 3], 1, "up")).toEqual([1, 2, 3]);
    expect(moveProduct([1, 2, 3], 3, "down")).toEqual([1, 2, 3]);
    expect(moveProduct([1, 2, 3], 9, "up")).toEqual([1, 2, 3]);
  });

  test("the helpers never change their input", () => {
    const original = [1, 2, 3];
    addProduct(original, 4);
    removeProduct(original, 1);
    moveProduct(original, 3, "up");
    expect(original).toEqual([1, 2, 3]);
  });

  test("sameOrder compares position by position", () => {
    expect(sameOrder([1, 2], [1, 2])).toBe(true);
    expect(sameOrder([1, 2], [2, 1])).toBe(false);
    expect(sameOrder([1, 2], [1])).toBe(false);
  });

  test("search matches every word in name, slug, category or brand, and hides chosen products", () => {
    const catalog = [
      { id: 1, name: "Classic Crewneck Tee", slug: "classic-crewneck-tee", categoryName: "T-Shirts & Tops", brandName: "AeroThread" },
      { id: 2, name: "Linen Resort Shirt", slug: "linen-resort-shirt", categoryName: "Shirts & Polos", brandName: null },
      { id: 3, name: "Canvas Tote Bag", slug: "canvas-tote-bag", categoryName: "Basics & Accessories", brandName: "Kanso Basics" },
    ];
    const ids = (query: string, selected: number[] = [], limit = 10) =>
      findPickable(catalog, selected, query, limit).matches.map((product) => product.id);

    expect(ids("")).toEqual([1, 2, 3]);
    expect(ids("TEE")).toEqual([1]);
    expect(ids("shirts")).toEqual([1, 2]);
    expect(ids("kanso tote")).toEqual([3]);
    expect(ids("aerothread crew")).toEqual([1]);
    expect(ids("tee linen")).toEqual([]);
    expect(ids("", [2])).toEqual([1, 3]);
    expect(findPickable(catalog, [], "", 2)).toMatchObject({ total: 3 });
    expect(ids("", [], 2)).toEqual([1, 2]);
  });
});
