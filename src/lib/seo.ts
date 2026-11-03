import type { Metadata } from "next";
import type { ProductFilters } from "@/features/catalog/api";
import { buildCatalogHref } from "@/features/catalog/search-params";
import { BANNERS } from "@/lib/banners";
import { BRANDS, CATEGORIES } from "@/lib/catalog-nav";
import { SITE_NAME } from "@/lib/site";

// Search-engine facing text and addresses, in one place.

const LOCAL_SITE_URL = "http://localhost:3001";

// The public address of the storefront, with no trailing slash. Set
// NEXT_PUBLIC_SITE_URL when the shop has its own domain; on Vercel the production
// host (VERCEL_PROJECT_PRODUCTION_URL, which has no scheme) is used otherwise,
// and localhost in development. A blank or unusable value never breaks anything.
export function getSiteUrl(
  environment: Partial<Record<string, string | undefined>> = process.env,
): string {
  const configured = environment.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && isHttpUrl(configured)) return stripTrailingSlash(configured);

  const vercelHost = environment.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost && isHttpUrl(`https://${vercelHost}`)) {
    return stripTrailingSlash(`https://${vercelHost}`);
  }
  return LOCAL_SITE_URL;
}

export function absoluteUrl(path: string, siteUrl: string = getSiteUrl()): string {
  return `${siteUrl}${path}`;
}

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

// Pages that belong to one visitor or to the shop's staff, or that only exist to
// move a visitor along. Kept out of search results and out of robots.txt's reach.
export const PRIVATE_PATHS = [
  "/account",
  "/admin",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/wishlist",
  "/demo-pay",
  "/payment-return",
] as const;

export function noIndex(): Pick<Metadata, "robots"> {
  return { robots: { index: false, follow: false } };
}

const HOME_DESCRIPTION =
  "Contemporary everyday fashion: foundational tees, pique polos, french terry hoodies, stretch chinos and technical activewear.";

// The home page keeps the site-wide title and gets its own sharing preview.
export function homeMetadata(): Metadata {
  const image = BANNERS["banner-hero-wide"].url;
  return {
    description: HOME_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      title: `${SITE_NAME} | Modern Everyday Fashion`,
      description: HOME_DESCRIPTION,
      url: "/",
      siteName: SITE_NAME,
      images: [{ url: image, alt: `${SITE_NAME} everyday fashion` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} | Modern Everyday Fashion`,
      description: HOME_DESCRIPTION,
      images: [image],
    },
  };
}

const CATALOG_DESCRIPTION =
  "Explore the full catalog of breathable t-shirts, activewear, everyday pants and minimalist outerwear.";

// Title, description and canonical address of a page of the catalog. A category
// or a brand is named by its label; page 2 and later say which page they are and
// have their own canonical address, while page 1 has no `page` parameter.
export function catalogMetadata({
  filters,
  page,
}: {
  filters: ProductFilters;
  page: number;
}): Metadata {
  const category = CATEGORIES.find((item) => item.slug === filters.category);
  const brand = BRANDS.find((item) => item.slug === filters.brand);

  let title = "Shop all products";
  let description = CATALOG_DESCRIPTION;
  let robots: Metadata["robots"];
  if (filters.q) {
    title = `Search results for "${filters.q}"`;
    description = `Products matching "${filters.q}" at ${SITE_NAME}.`;
    // Search results are endless variations: let them be followed, not listed.
    robots = { index: false, follow: true };
  } else if (category) {
    title = category.label;
    description = `Shop ${category.label} at ${SITE_NAME}: modern everyday fashion made for comfort and movement.`;
  } else if (brand) {
    title = brand.label;
    description = `Shop ${brand.label} (${brand.description}) at ${SITE_NAME}.`;
  }

  if (page > 1) {
    title = `${title}, page ${page}`;
    description = `${description} Page ${page}.`;
  }

  return {
    title,
    description,
    alternates: { canonical: buildCatalogHref(filters, page) },
    ...(robots ? { robots } : {}),
  };
}

export interface ProductForMetadata {
  name: string;
  slug: string;
  description: string | null;
  images: Array<{ url: string; altText: string | null }>;
}

// Title, description, canonical address and sharing preview of a product page,
// built only from what the product really has.
export function productMetadata(product: ProductForMetadata): Metadata {
  const description =
    product.description?.trim() || `${product.name} from ${SITE_NAME}.`;
  const image = product.images[0];
  const path = `/products/${encodeURIComponent(product.slug)}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: path,
      siteName: SITE_NAME,
      ...(image
        ? { images: [{ url: image.url, alt: image.altText ?? product.name }] }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.name,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export interface ProductForJsonLd extends ProductForMetadata {
  brand: { name: string } | null;
  minPrice: number | null;
  maxPrice: number | null;
  variants: Array<{ stock: number }>;
}

// schema.org Product data for a product page, as text to put in a
// <script type="application/ld+json">. It holds only what the product really has:
// no ratings, reviews, SKUs or identifiers are made up, and anything missing is
// left out. "<" is escaped so the text can never close the script tag.
export function productJsonLd(
  product: ProductForJsonLd,
  siteUrl: string = getSiteUrl(),
): string {
  const url = absoluteUrl(`/products/${encodeURIComponent(product.slug)}`, siteUrl);
  const availability = product.variants.some((variant) => variant.stock > 0)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  let offers: Record<string, unknown> | undefined;
  if (product.minPrice !== null && product.maxPrice !== null) {
    offers =
      product.minPrice === product.maxPrice
        ? {
            "@type": "Offer",
            url,
            price: product.minPrice,
            priceCurrency: "VND",
            availability,
          }
        : {
            "@type": "AggregateOffer",
            url,
            lowPrice: product.minPrice,
            highPrice: product.maxPrice,
            priceCurrency: "VND",
            offerCount: product.variants.length,
            availability,
          };
  }

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length > 0
      ? { image: product.images.map((image) => image.url) }
      : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(offers ? { offers } : {}),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Fixed pages of the sitemap: the home page, the catalog, the About page, and one
// page for every category and brand.
export function staticSitemapPaths(): string[] {
  return [
    "/",
    "/products",
    "/about-demo",
    ...CATEGORIES.map((item) => item.href),
    ...BRANDS.map((item) => item.href),
  ];
}

export interface SitemapProduct {
  slug: string;
  updatedAt?: string;
}

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
}

// The fixed pages, then a page for every product. With no products (the backend
// could not be reached) it is still a valid sitemap of the fixed pages.
export function sitemapEntries(
  siteUrl: string,
  products: SitemapProduct[],
): SitemapEntry[] {
  const entries: SitemapEntry[] = staticSitemapPaths().map((path) => ({
    url: absoluteUrl(path, siteUrl),
  }));
  for (const product of products) {
    entries.push({
      url: absoluteUrl(`/products/${encodeURIComponent(product.slug)}`, siteUrl),
      ...(product.updatedAt
        ? { lastModified: new Date(product.updatedAt) }
        : {}),
    });
  }
  return entries;
}
