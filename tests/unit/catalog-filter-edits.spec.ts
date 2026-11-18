import { expect, test } from "@playwright/test";
import {
  CATALOG_PATH,
  PRICE_PRESETS,
  brandChoices,
  catalogHrefFor,
  categoryChoices,
  clearAllFilters,
  clearKey,
  colorChoices,
  facetCounts,
  setInStock,
  setPricePreset,
  setPriceRange,
  setSingle,
  sizeChoices,
  toggleMulti,
  type ParamsEdit,
} from "@/features/catalog/filter-edits";
import {
  buildCatalogHref,
  countActiveFilters,
  parseProductFilters,
} from "@/features/catalog/search-params";
import {
  HOME_PRODUCTS_NEEDED,
  HOME_SECTION_PRODUCTS,
  pickEverydayEssentials,
} from "@/features/collections/home";
import { PRICE_MAX_VND } from "@/lib/limits";
import type { CatalogFilterOptions, ProductSummary } from "@/types/catalog";

// What the filter bar (desktop) and the filter list in the phone drawer do to the
// address. Both use these edits, so this is the behaviour of both.

const edit = (current: string, change: ParamsEdit) =>
  catalogHrefFor(new URLSearchParams(current), change);
const query = (href: string) => new URLSearchParams(href.split("?")[1] ?? "");

test.describe("catalog filter edits: the address", () => {
  test("any change starts again from the first page and keeps everything else", () => {
    const href = edit(
      "q=tee&sort=price_asc&page=3&brand=hushwell",
      setSingle("category", "tops"),
    );
    expect(href.startsWith(`${CATALOG_PATH}?`)).toBe(true);
    const params = query(href);
    expect(params.has("page")).toBe(false);
    expect(params.get("q")).toBe("tee");
    expect(params.get("sort")).toBe("price_asc");
    expect(params.get("brand")).toBe("hushwell");
    expect(params.get("category")).toBe("tops");
  });

  test("with nothing left, the address is the plain catalog", () => {
    expect(edit("category=tops&page=2", setSingle("category"))).toBe(CATALOG_PATH);
    expect(edit("", clearAllFilters)).toBe(CATALOG_PATH);
  });

  test("a category or brand is one choice: set, replace, clear", () => {
    expect(query(edit("category=tops", setSingle("category", "pants"))).getAll("category")).toEqual([
      "pants",
    ]);
    expect(query(edit("brand=a", setSingle("brand"))).has("brand")).toBe(false);
  });

  test("a size or colour is added, kept in order, and removed again", () => {
    const added = edit("size=M", toggleMulti("size", ["M"], "L"));
    expect(query(added).getAll("size")).toEqual(["M", "L"]);
    const removed = edit("size=M&size=L", toggleMulti("size", ["M", "L"], "M"));
    expect(query(removed).getAll("size")).toEqual(["L"]);
    const emptied = edit("color=Black", toggleMulti("color", ["Black"], "Black"));
    expect(query(emptied).has("color")).toBe(false);
    // The other group is left alone.
    expect(query(edit("color=Red", toggleMulti("size", [], "S"))).getAll("color")).toEqual(["Red"]);
  });

  test("clearKey removes just the named parameters", () => {
    const params = query(
      edit("size=M&color=Red&minPrice=1&maxPrice=9", clearKey("minPrice", "maxPrice")),
    );
    expect([...params.keys()].sort()).toEqual(["color", "size"]);
  });

  test("in stock is on or absent, never false", () => {
    expect(query(edit("", setInStock(true))).get("inStock")).toBe("true");
    expect(query(edit("inStock=true", setInStock(false))).has("inStock")).toBe(false);
  });

  test("clear all drops every filter and the search, and keeps the sort", () => {
    const href = edit(
      "q=tee&category=tops&brand=a&size=M&color=Red&minPrice=1&maxPrice=9&inStock=true&sort=name_asc&page=2",
      clearAllFilters,
    );
    expect(href).toBe(`${CATALOG_PATH}?sort=name_asc`);
    // The bar's "Clear all" link is built with the existing builder: same result.
    expect(buildCatalogHref({ sort: "name_asc" })).toBe(href);
    expect(buildCatalogHref({ sort: undefined })).toBe(CATALOG_PATH);
  });
});

test.describe("catalog filter edits: the price", () => {
  test("two valid prices are set, as whole numbers", () => {
    const params = query(edit("", setPriceRange("100000", "500000.9")));
    expect(params.get("minPrice")).toBe("100000");
    expect(params.get("maxPrice")).toBe("500000");
  });

  test("a box that is empty, not a number, negative or above the limit is left out", () => {
    for (const bad of ["", "   ", "abc", "-1", String(PRICE_MAX_VND + 1), "Infinity"]) {
      const params = query(edit("minPrice=5&maxPrice=6", setPriceRange(bad, bad)));
      expect(params.has("minPrice"), `min "${bad}"`).toBe(false);
      expect(params.has("maxPrice"), `max "${bad}"`).toBe(false);
    }
  });

  test("each box is judged on its own", () => {
    const params = query(edit("", setPriceRange("250000", "oops")));
    expect(params.get("minPrice")).toBe("250000");
    expect(params.has("maxPrice")).toBe(false);
  });

  test("zero and the limit itself are allowed", () => {
    const params = query(edit("", setPriceRange("0", String(PRICE_MAX_VND))));
    expect(params.get("minPrice")).toBe("0");
    expect(params.get("maxPrice")).toBe(String(PRICE_MAX_VND));
  });

  test("a preset sets both ends, and an open end clears that parameter", () => {
    const [under, between, over] = PRICE_PRESETS;
    const a = query(edit("minPrice=1&maxPrice=2", setPricePreset(under.min, under.max)));
    expect(a.has("minPrice")).toBe(false);
    expect(a.get("maxPrice")).toBe("250000");
    const b = query(edit("", setPricePreset(between.min, between.max)));
    expect([b.get("minPrice"), b.get("maxPrice")]).toEqual(["250000", "500000"]);
    const c = query(edit("maxPrice=2", setPricePreset(over.min, over.max)));
    expect(c.get("minPrice")).toBe("500000");
    expect(c.has("maxPrice")).toBe(false);
  });

  test("the presets are the three the drawer always had", () => {
    expect(PRICE_PRESETS.map((preset) => preset.label)).toEqual([
      expect.stringMatching(/^Under /),
      "250k – 500k",
      expect.stringMatching(/^Over /),
    ]);
  });
});

test.describe("catalog filter edits: the options", () => {
  const options: CatalogFilterOptions = {
    categories: [
      { id: 1, name: "Tops", slug: "tops" },
      { id: 2, name: "Pants", slug: "pants" },
    ],
    brands: [{ id: 1, name: "Hushwell", slug: "hushwell" }],
    sizes: ["S", "M", "L"],
    colors: ["Black", "Red"],
    minPrice: 0,
    maxPrice: 1,
  };

  test("a one-of-many group starts with an All choice that is selected when nothing is", () => {
    const none = categoryChoices({}, options);
    expect(none.map((choice) => choice.label)).toEqual(["All Categories", "Tops", "Pants"]);
    expect(none.map((choice) => choice.selected)).toEqual([true, false, false]);
    expect(none[0].value).toBeUndefined();

    const picked = categoryChoices({ category: "pants" }, options);
    expect(picked.map((choice) => choice.selected)).toEqual([false, false, true]);
    expect(brandChoices({ brand: "hushwell" }, options).map((c) => c.selected)).toEqual([
      false,
      true,
    ]);
    expect(brandChoices({}, options)[0].label).toBe("All Brands");
  });

  test("a many-of-many group marks every selected value", () => {
    expect(sizeChoices({ size: ["S", "L"] }, options)).toEqual([
      { value: "S", selected: true },
      { value: "M", selected: false },
      { value: "L", selected: true },
    ]);
    expect(colorChoices({}, options).every((choice) => !choice.selected)).toBe(true);
  });

  test("the badge counts are per group, a price range counts once, search is not a group", () => {
    expect(
      facetCounts({
        q: "tee",
        category: "tops",
        size: ["S", "M"],
        color: ["Red"],
        minPrice: 1,
        maxPrice: 2,
        inStock: true,
      }),
    ).toEqual({ category: 1, brand: 0, size: 2, color: 1, price: 1, inStock: 1 });
    expect(facetCounts({ maxPrice: 5 }).price).toBe(1);
    expect(facetCounts({})).toEqual({
      category: 0,
      brand: 0,
      size: 0,
      color: 0,
      price: 0,
      inStock: 0,
    });
  });

  test("an address built by the edits reads back, and builds back, the same", () => {
    let href = CATALOG_PATH;
    const apply = (change: ParamsEdit) => {
      href = edit(href.split("?")[1] ?? "", change);
    };
    apply(setSingle("category", "tops"));
    apply(setSingle("brand", "hushwell"));
    apply(toggleMulti("size", [], "M"));
    apply(toggleMulti("color", [], "Red"));
    apply(setPriceRange("100000", "300000"));
    apply(setInStock(true));

    const read = parseProductFilters(Object.fromEntries(
      [...query(href).keys()].map((key) => [key, query(href).getAll(key)]),
    ));
    expect(read).toMatchObject({
      category: "tops",
      brand: "hushwell",
      size: ["M"],
      color: ["Red"],
      minPrice: 100000,
      maxPrice: 300000,
      inStock: true,
    });
    expect(countActiveFilters(read)).toBe(
      Object.values(facetCounts(read)).reduce((sum, count) => sum + count, 0),
    );
    // The existing builder gives the same address for the filters just read.
    expect(query(buildCatalogHref(read)).toString().split("&").sort()).toEqual(
      query(href).toString().split("&").sort(),
    );
  });
});

// The home page used to fetch the whole catalog and show up to 16 products; it now
// asks for the first HOME_PRODUCTS_NEEDED. The second section must be the same.
test.describe("home page: the first 16 products are enough", () => {
  const product = (id: number) => ({ id }) as ProductSummary;
  const catalogOf = (size: number) => Array.from({ length: size }, (_, i) => product(i + 1));

  // A small deterministic generator, so a failure can be repeated.
  function random(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  test("it asks for twice the section size", () => {
    expect(HOME_SECTION_PRODUCTS).toBe(8);
    expect(HOME_PRODUCTS_NEEDED).toBe(16);
  });

  test("with the first 8 of the catalog as the first section, nothing changes", () => {
    const whole = catalogOf(60);
    const featured = whole.slice(0, HOME_SECTION_PRODUCTS);
    const fromWhole = pickEverydayEssentials(whole, featured);
    const fromFirst = pickEverydayEssentials(whole.slice(0, HOME_PRODUCTS_NEEDED), featured);
    expect(fromFirst.map((p) => p.id)).toEqual(fromWhole.map((p) => p.id));
    expect(fromWhole.map((p) => p.id)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
  });

  test("for any catalog size and any first section of up to 8 products, it is the same", () => {
    const next = random(2026);
    for (let run = 0; run < 400; run += 1) {
      const whole = catalogOf(Math.floor(next() * 61));
      // A featured collection's products can be anywhere in the catalog.
      const count = Math.floor(next() * (HOME_SECTION_PRODUCTS + 1));
      const featured = [...whole]
        .sort(() => next() - 0.5)
        .slice(0, Math.min(count, whole.length));
      const fromWhole = pickEverydayEssentials(whole, featured);
      const fromFirst = pickEverydayEssentials(
        whole.slice(0, HOME_PRODUCTS_NEEDED),
        featured,
      );
      expect(
        fromFirst.map((p) => p.id),
        `run ${run}: ${whole.length} products, first section ${featured.map((p) => p.id)}`,
      ).toEqual(fromWhole.map((p) => p.id));
    }
  });

  test("the second section never repeats the first and never shows more than 8", () => {
    const whole = catalogOf(30);
    const featured = [whole[2], whole[9], whole[20]];
    const second = pickEverydayEssentials(whole, featured);
    expect(second).toHaveLength(HOME_SECTION_PRODUCTS);
    for (const item of featured) expect(second).not.toContain(item);
  });

  test("a small catalog just shows what is left", () => {
    expect(pickEverydayEssentials(catalogOf(5), catalogOf(5).slice(0, 5))).toEqual([]);
    expect(pickEverydayEssentials(catalogOf(0), [])).toEqual([]);
  });
});
