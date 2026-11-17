import type { BannerKey } from "./banners";

// The presentation of categories and brands: label, picture and order, kept here
// by slug. Whether a category or brand is SHOWN is not decided here. The pages
// ask the API which ones exist (see features/catalog/nav.ts) and pass that answer
// to resolveNavCatalog, so the shop can be deployed before or after the catalog
// expansion is seeded and never links to a category that is not there.

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

// What the menus, the footer and the home page show.
export interface NavCatalog {
  categories: readonly NavCategory[];
  brands: readonly NavBrand[];
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

// Every category the shop has a presentation for, in display order. The two
// newer ones sit before the catch-all "Basics & Accessories".
export const CATEGORIES: readonly NavCategory[] = [
  category("t-shirts-tops", "T-Shirts & Tops", "category-t-shirts-tops"),
  category("shirts-polos", "Shirts & Polos", "category-shirts-polos"),
  category(
    "hoodies-outerwear",
    "Hoodies & Outerwear",
    "category-hoodies-outerwear",
  ),
  category("pants-shorts", "Pants & Shorts", "category-pants-shorts"),
  category("activewear", "Activewear", "category-activewear"),
  category(
    "loungewear-sleepwear",
    "Loungewear & Sleepwear",
    "category-loungewear-sleepwear",
  ),
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
  brand("ardent-motion", "Ardent Motion", "Seamless Training"),
  brand("hushwell", "Hushwell", "Soft Loungewear"),
  brand("tidewell", "Tidewell", "Weather-Ready Layers"),
  brand("cinder-oak", "Cinder & Oak", "Heritage Casualwear"),
];

// The categories and brands of the base seed: every deployment has them, whatever
// the state of the catalog expansion. They are what is shown when the lookup of
// the real ones fails (the backend is down), so the menus keep their links.
export const BASE_CATEGORY_SLUGS: readonly string[] = [
  "t-shirts-tops",
  "shirts-polos",
  "hoodies-outerwear",
  "pants-shorts",
  "basics-accessories",
];

export const BASE_BRAND_SLUGS: readonly string[] = [
  "aerothread",
  "kanso-basics",
  "veloce-active",
  "monolith-studio",
];

// The presentation entries whose slug the API returned, in display order. A slug
// the API has but this file does not (a category an admin just made) is left out:
// it has no picture or label here, and the catalog filter still lists it. A
// `null` answer means the lookup failed: the base seed's entries are used.
export function resolveNavCatalog(existing: {
  categories: readonly string[] | null;
  brands: readonly string[] | null;
}): NavCatalog {
  const categories = new Set(existing.categories ?? BASE_CATEGORY_SLUGS);
  const brands = new Set(existing.brands ?? BASE_BRAND_SLUGS);
  return {
    categories: CATEGORIES.filter((item) => categories.has(item.slug)),
    brands: BRANDS.filter((item) => brands.has(item.slug)),
  };
}

// Only a few direct links fit beside the search and account controls. The
// third one is shown under a shorter name.
const PRIMARY_NAV_NAMES: Record<string, string | undefined> = {
  "t-shirts-tops": undefined,
  "shirts-polos": undefined,
  "hoodies-outerwear": "Outerwear",
};

export function primaryNavItems(
  categories: readonly NavCategory[],
): Array<{ name: string; href: string }> {
  return categories
    .filter((item) => item.slug in PRIMARY_NAV_NAMES)
    .map((item) => ({
      name: PRIMARY_NAV_NAMES[item.slug] ?? item.label,
      href: item.href,
    }));
}

export function footerCategories(
  categories: readonly NavCategory[],
): Array<{ label: string; href: string }> {
  return [
    { label: "All Products", href: "/products" },
    ...categories.map(({ label, href }) => ({ label, href })),
  ];
}

export function footerBrands(
  brands: readonly NavBrand[],
): Array<{ label: string; href: string; desc: string }> {
  return brands.map(({ label, href, description }) => ({
    label,
    href,
    desc: description,
  }));
}

export function menuBrandLinks(
  brands: readonly NavBrand[],
): Array<{ label: string; href: string }> {
  return brands.map(({ label, href, menuDescription }) => ({
    label: `${label} — ${menuDescription}`,
    href,
  }));
}
