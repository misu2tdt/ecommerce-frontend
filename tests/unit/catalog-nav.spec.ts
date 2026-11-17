import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { BANNERS } from "@/lib/banners";
import {
  BRANDS,
  CATEGORIES,
  footerBrands,
  footerCategories,
  menuBrandLinks,
  primaryNavItems,
  resolveNavCatalog,
} from "@/lib/catalog-nav";

const read = (file: string) =>
  readFileSync(path.resolve(process.cwd(), file), "utf8");

// What a deployment that has only the base seed shows (the catalog expansion not
// seeded yet, or the lookup failed): the five original categories, four brands.
const base = resolveNavCatalog({ categories: null, brands: null });

test.describe("shared catalog navigation lists", () => {
  test("categories are unique and link to the catalog filter", () => {
    expect(CATEGORIES.map((category) => category.label)).toEqual([
      "T-Shirts & Tops",
      "Shirts & Polos",
      "Hoodies & Outerwear",
      "Pants & Shorts",
      "Activewear",
      "Loungewear & Sleepwear",
      "Basics & Accessories",
    ]);
    expect(new Set(CATEGORIES.map((c) => c.slug)).size).toBe(CATEGORIES.length);
    for (const category of CATEGORIES) {
      expect(category.href).toBe(`/products?category=${category.slug}`);
      expect(category.bannerKey, `${category.slug} banner`).toBe(
        `category-${category.slug}`,
      );
      expect(BANNERS[category.bannerKey]).toBeDefined();
    }
  });

  test("brands are unique and link to the catalog filter", () => {
    expect(BRANDS.map((brand) => brand.label)).toEqual([
      "AeroThread",
      "Kanso Basics",
      "Veloce Active",
      "Monolith Studio",
      "Ardent Motion",
      "Hushwell",
      "Tidewell",
      "Cinder & Oak",
    ]);
    expect(new Set(BRANDS.map((b) => b.slug)).size).toBe(BRANDS.length);
    for (const brand of BRANDS) {
      expect(brand.href).toBe(`/products?brand=${brand.slug}`);
    }
  });

  test("the header navigation keeps its three direct links and labels", () => {
    const expected = [
      { name: "T-Shirts & Tops", href: "/products?category=t-shirts-tops" },
      { name: "Shirts & Polos", href: "/products?category=shirts-polos" },
      { name: "Outerwear", href: "/products?category=hoodies-outerwear" },
    ];
    expect(primaryNavItems(base.categories)).toEqual(expected);
    // The new categories do not crowd the header bar.
    expect(primaryNavItems(CATEGORIES)).toEqual(expected);
  });

  test("the mega menu keeps its brand link labels", () => {
    expect(menuBrandLinks(base.brands)).toEqual([
      { label: "AeroThread — Everyday Minimal", href: "/products?brand=aerothread" },
      {
        label: "Kanso Basics — Comfort Essentials",
        href: "/products?brand=kanso-basics",
      },
      {
        label: "Veloce Active — Athletic Performance",
        href: "/products?brand=veloce-active",
      },
      {
        label: "Monolith Studio — Structured Tailoring",
        href: "/products?brand=monolith-studio",
      },
    ]);
  });

  test("the footer keeps its category and brand links and descriptions", () => {
    expect(footerCategories(base.categories)).toEqual([
      { label: "All Products", href: "/products" },
      { label: "T-Shirts & Tops", href: "/products?category=t-shirts-tops" },
      { label: "Shirts & Polos", href: "/products?category=shirts-polos" },
      { label: "Hoodies & Outerwear", href: "/products?category=hoodies-outerwear" },
      { label: "Pants & Shorts", href: "/products?category=pants-shorts" },
      { label: "Basics & Accessories", href: "/products?category=basics-accessories" },
    ]);
    expect(footerBrands(base.brands)).toEqual([
      { label: "AeroThread", href: "/products?brand=aerothread", desc: "Everyday Minimal" },
      { label: "Kanso Basics", href: "/products?brand=kanso-basics", desc: "Comfort Essentials" },
      { label: "Veloce Active", href: "/products?brand=veloce-active", desc: "Performance Apparel" },
      { label: "Monolith Studio", href: "/products?brand=monolith-studio", desc: "Structured Tailoring" },
    ]);
  });

  test("the new categories and brands appear in the footer and the menu once they exist", () => {
    const full = resolveNavCatalog({
      categories: CATEGORIES.map((item) => item.slug),
      brands: BRANDS.map((item) => item.slug),
    });
    expect(footerCategories(full.categories).map((item) => item.label)).toEqual([
      "All Products",
      "T-Shirts & Tops",
      "Shirts & Polos",
      "Hoodies & Outerwear",
      "Pants & Shorts",
      "Activewear",
      "Loungewear & Sleepwear",
      "Basics & Accessories",
    ]);
    expect(footerBrands(full.brands).map((item) => item.label)).toEqual(
      BRANDS.map((item) => item.label),
    );
    expect(menuBrandLinks(full.brands).map((item) => item.href)).toContain(
      "/products?brand=cinder-oak",
    );
  });

  test("no list has duplicate hrefs", () => {
    const full = resolveNavCatalog({
      categories: CATEGORIES.map((item) => item.slug),
      brands: BRANDS.map((item) => item.slug),
    });
    for (const list of [
      primaryNavItems(full.categories),
      footerCategories(full.categories),
      footerBrands(full.brands),
      menuBrandLinks(full.brands),
    ]) {
      const hrefs = list.map((item) => item.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  test("every consumer imports the shared lists instead of keeping a copy", () => {
    for (const file of [
      "src/components/nav-mega-menu.tsx",
      "src/components/mobile-nav.tsx",
      "src/components/site-footer.tsx",
      "src/app/page.tsx",
      "src/components/home/category-section.tsx",
      "src/components/home/brand-section.tsx",
    ]) {
      const source = read(file);
      // The home page itself only assembles components that import the lists.
      if (file !== "src/app/page.tsx") {
        expect(source, `${file} imports the lists`).toContain(
          "@/lib/catalog-nav",
        );
      }
      expect(source, `${file} has no hard-coded category link`).not.toMatch(
        /\/products\?category=/,
      );
      expect(source, `${file} has no hard-coded brand link`).not.toMatch(
        /\/products\?brand=/,
      );
    }
  });
});

test.describe("banner constants", () => {
  test("hold the fifteen banners as Cloudinary https urls: 3:2, and the hero-wide one 16:9", () => {
    expect(Object.keys(BANNERS).sort()).toEqual([
      "banner-hero",
      "banner-hero-wide",
      "brand-ardent-motion",
      "brand-cinder-oak",
      "brand-hushwell",
      "brand-monolith-studio",
      "brand-tidewell",
      "brand-veloce-active",
      "category-activewear",
      "category-basics-accessories",
      "category-hoodies-outerwear",
      "category-loungewear-sleepwear",
      "category-pants-shorts",
      "category-shirts-polos",
      "category-t-shirts-tops",
    ]);
    for (const [key, banner] of Object.entries(BANNERS)) {
      expect(banner.url, key).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      const expectedRatio = key === "banner-hero-wide" ? 16 / 9 : 1.5;
      expect(banner.width / banner.height, key).toBeCloseTo(expectedRatio, 1);
    }
  });
});
