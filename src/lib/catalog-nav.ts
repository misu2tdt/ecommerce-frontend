import type { BannerKey } from "./banners";

// The one list of categories and brands. The home page, the header's mega menu
// and the footer all read from here, so a category is added in one place.

export interface NavCategory {
  slug: string;
  label: string;
  href: string;
  bannerKey: Extract<BannerKey, `category-${string}`>;
}

export interface NavBrand {
  slug: string;
  label: string;
  href: string;
  // Short line in the footer, and the (slightly different) one in the mega menu.
  description: string;
  menuDescription: string;
}

function category(
  slug: string,
  label: string,
  bannerKey: NavCategory["bannerKey"],
): NavCategory {
  return { slug, label, href: `/products?category=${slug}`, bannerKey };
}

function brand(
  slug: string,
  label: string,
  description: string,
  menuDescription = description,
): NavBrand {
  return {
    slug,
    label,
    href: `/products?brand=${slug}`,
    description,
    menuDescription,
  };
}

export const CATEGORIES: readonly NavCategory[] = [
  category("t-shirts-tops", "T-Shirts & Tops", "category-t-shirts-tops"),
  category("shirts-polos", "Shirts & Polos", "category-shirts-polos"),
  category(
    "hoodies-outerwear",
    "Hoodies & Outerwear",
    "category-hoodies-outerwear",
  ),
  category("pants-shorts", "Pants & Shorts", "category-pants-shorts"),
  category(
    "basics-accessories",
    "Basics & Accessories",
    "category-basics-accessories",
  ),
];

export const BRANDS: readonly NavBrand[] = [
  brand("aerothread", "AeroThread", "Everyday Minimal"),
  brand("kanso-basics", "Kanso Basics", "Comfort Essentials"),
  brand(
    "veloce-active",
    "Veloce Active",
    "Performance Apparel",
    "Athletic Performance",
  ),
  brand("monolith-studio", "Monolith Studio", "Structured Tailoring"),
];

// Only a few direct links fit beside the search and account controls. The
// third one is shown under a shorter name.
const PRIMARY_NAV_NAMES: Record<string, string | undefined> = {
  "t-shirts-tops": undefined,
  "shirts-polos": undefined,
  "hoodies-outerwear": "Outerwear",
};

export const PRIMARY_NAV_ITEMS: Array<{ name: string; href: string }> =
  CATEGORIES.filter((item) => item.slug in PRIMARY_NAV_NAMES).map((item) => ({
    name: PRIMARY_NAV_NAMES[item.slug] ?? item.label,
    href: item.href,
  }));

export const FOOTER_CATEGORIES: Array<{ label: string; href: string }> = [
  { label: "All Products", href: "/products" },
  ...CATEGORIES.map(({ label, href }) => ({ label, href })),
];

export const FOOTER_BRANDS: Array<{
  label: string;
  href: string;
  desc: string;
}> = BRANDS.map(({ label, href, description }) => ({
  label,
  href,
  desc: description,
}));

export const MENU_BRAND_LINKS: Array<{ label: string; href: string }> =
  BRANDS.map(({ label, href, menuDescription }) => ({
    label: `${label} — ${menuDescription}`,
    href,
  }));
