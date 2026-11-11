import type { Metadata } from "next";
import Link from "next/link";
import { BrandSection } from "@/components/home/brand-section";
import { CategorySection } from "@/components/home/category-section";
import { Hero } from "@/components/home/hero";
import { ValueStrip } from "@/components/home/value-strip";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getProducts } from "@/features/catalog/api";
import {
  HOME_SECTION_PRODUCTS,
  loadHomeFeatured,
  secondSectionHeading,
} from "@/features/collections/home";
import { collectionPath } from "@/features/collections/search-params";
import { ApiError } from "@/lib/api";
import { homeMetadata } from "@/lib/seo";
import type { ProductSummary } from "@/types/catalog";

export const metadata: Metadata = homeMetadata();

const featuredFallbackText =
  "Foundational tees, polos, and daily layers from our catalog.";

const viewLink =
  "inline-flex min-h-11 items-center text-body-sm font-bold text-brand transition hover:underline focus-visible:outline-2 focus-visible:outline-brand";

export default async function Home() {
  let products: ProductSummary[] = [];
  const featuredRequest = loadHomeFeatured();

  try {
    products = await getProducts();
  } catch (error) {
    // Keep homepage resilient if the catalog API is unreachable during build or
    // cold start, but say why: the page only shows "temporarily unavailable",
    // which a rejected request (400), a rate limit (429) and an outage all share.
    const status = error instanceof ApiError ? error.status : "unknown";
    console.error(
      `[home] could not load products (HTTP ${status}): ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  // The featured collection when there is one (a failed request or no featured
  // collection gives null and the previous behaviour below), otherwise the first
  // products of the catalog. Products are never repeated between the sections.
  const featured = await featuredRequest;
  const featuredProducts =
    featured?.products ?? products.slice(0, HOME_SECTION_PRODUCTS);
  const featuredText = featured
    ? featured.collection.description
    : featuredFallbackText;
  const shownIds = new Set(featuredProducts.map((product) => product.id));
  const everydayEssentials = products
    .filter((product) => !shownIds.has(product.id))
    .slice(0, HOME_SECTION_PRODUCTS);

  return (
    <div className="flex flex-col">
      <Hero />
      <ValueStrip />
      <CategorySection />

      {/* FEATURED COLLECTION PRODUCT GRID */}
      <section className="border-t border-line bg-surface-muted py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow className="text-neutral-600">Featured</Eyebrow>
              <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
                {featured ? featured.collection.name : "Featured Collection"}
              </h2>
              {featuredText && (
                <p className="mt-1 text-body-sm text-neutral-600">{featuredText}</p>
              )}
            </div>
            {featured ? (
              <Link href={collectionPath(featured.collection.slug)} className={viewLink}>
                View collection &rarr;
              </Link>
            ) : (
              <Link href="/products" className={viewLink}>
                View all products &rarr;
              </Link>
            )}
          </div>

          {featuredProducts.length === 0 ? (
            <div className="mt-8 rounded-md border border-dashed border-field-border bg-surface p-12 text-center text-neutral-600">
              <p className="font-semibold text-brand">Products are temporarily unavailable.</p>
              <p className="mt-1 text-body-sm">Please try again shortly.</p>
            </div>
          ) : (
            <ProductGrid variant="home" className="mt-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          )}
        </div>
      </section>

      <BrandSection />

      {/* EVERYDAY ESSENTIALS (only when the catalog has more products to show) */}
      {everydayEssentials.length > 0 && (
        <section className="border-t border-line bg-surface-muted py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow className="text-neutral-600">Core Wardrobe</Eyebrow>
                <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
                  {secondSectionHeading(featured?.collection.name ?? null)}
                </h2>
                <p className="mt-1 text-body-sm text-neutral-600">
                  Versatile staples designed for comfortable daily rotation.
                </p>
              </div>
              <Link href="/products" className={viewLink}>
                Explore entire catalog &rarr;
              </Link>
            </div>

            <ProductGrid variant="home" className="mt-8">
              {everydayEssentials.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </div>
        </section>
      )}
    </div>
  );
}
