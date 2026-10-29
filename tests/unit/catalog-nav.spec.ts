import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { BANNERS } from "@/lib/banners";
import {
  BRANDS,
  CATEGORIES,
  FOOTER_BRANDS,
  FOOTER_CATEGORIES,
  MENU_BRAND_LINKS,
  PRIMARY_NAV_ITEMS,
} from "@/lib/catalog-nav";

const read = (file: string) =>
  readFileSync(path.resolve(process.cwd(), file), "utf8");

test.describe("shared catalog navigation lists", () => {
  test("categories are unique and link to the catalog filter", () => {
    expect(CATEGORIES.map((category) => category.label)).toEqual([
      "T-Shirts & Tops",
      "Shirts & Polos",
      "Hoodies & Outerwear",
      "Pants & Shorts",
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
    ]);
    expect(new Set(BRANDS.map((b) => b.slug)).size).toBe(BRANDS.length);
    for (const brand of BRANDS) {
      expect(brand.href).toBe(`/products?brand=${brand.slug}`);
    }
  });

  test("the header navigation keeps its three direct links and labels", () => {
    expect(PRIMARY_NAV_ITEMS).toEqual([
      { name: "T-Shirts & Tops", href: "/products?category=t-shirts-tops" },
      { name: "Shirts & Polos", href: "/products?category=shirts-polos" },
      { name: "Outerwear", href: "/products?category=hoodies-outerwear" },
    ]);
  });

  test("the mega menu keeps its brand link labels", () => {
    expect(MENU_BRAND_LINKS).toEqual([
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
    expect(FOOTER_CATEGORIES).toEqual([
      { label: "All Products", href: "/products" },
      { label: "T-Shirts & Tops", href: "/products?category=t-shirts-tops" },
      { label: "Shirts & Polos", href: "/products?category=shirts-polos" },
      { label: "Hoodies & Outerwear", href: "/products?category=hoodies-outerwear" },
      { label: "Pants & Shorts", href: "/products?category=pants-shorts" },
      { label: "Basics & Accessories", href: "/products?category=basics-accessories" },
    ]);
    expect(FOOTER_BRANDS).toEqual([
      { label: "AeroThread", href: "/products?brand=aerothread", desc: "Everyday Minimal" },
      { label: "Kanso Basics", href: "/products?brand=kanso-basics", desc: "Comfort Essentials" },
      { label: "Veloce Active", href: "/products?brand=veloce-active", desc: "Performance Apparel" },
      { label: "Monolith Studio", href: "/products?brand=monolith-studio", desc: "Structured Tailoring" },
    ]);
  });

  test("no list has duplicate hrefs", () => {
    for (const list of [
      PRIMARY_NAV_ITEMS,
      FOOTER_CATEGORIES,
      FOOTER_BRANDS,
      MENU_BRAND_LINKS,
    ]) {
      const hrefs = list.map((item) => item.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  test("every consumer imports the shared lists instead of keeping a copy", () => {
    for (const file of [
      "src/components/nav-mega-menu.tsx",
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
  test("hold the eight banners as Cloudinary https urls with 3:2 sizes", () => {
    expect(Object.keys(BANNERS).sort()).toEqual([
      "banner-hero",
      "brand-monolith-studio",
      "brand-veloce-active",
      "category-basics-accessories",
      "category-hoodies-outerwear",
      "category-pants-shorts",
      "category-shirts-polos",
      "category-t-shirts-tops",
    ]);
    for (const [key, banner] of Object.entries(BANNERS)) {
      expect(banner.url, key).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      expect(banner.width / banner.height, key).toBeCloseTo(1.5, 2);
    }
  });
});
