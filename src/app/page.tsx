import Link from "next/link";
import { BrandSection } from "@/components/home/brand-section";
import { CategorySection } from "@/components/home/category-section";
import { Hero } from "@/components/home/hero";
import { ValueStrip } from "@/components/home/value-strip";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getProducts } from "@/features/catalog/api";
import { ApiError } from "@/lib/api";
import type { ProductSummary } from "@/types/catalog";

// Two full rows of four on wide screens. If the catalog has fewer products,
// each section simply shows what it gets.
const PRODUCTS_PER_SECTION = 8;

export default async function Home() {
  let products: ProductSummary[] = [];

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

  // Curate products deterministically without repeating
  const featuredCollection = products.slice(0, PRODUCTS_PER_SECTION);
  const everydayEssentials = products.slice(
    PRODUCTS_PER_SECTION,
    PRODUCTS_PER_SECTION * 2,
  );

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
              <Eyebrow className="text-neutral-600">Curated Selection</Eyebrow>
              <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
                Featured Collection
              </h2>
              <p className="mt-1 text-body-sm text-neutral-600">
                Foundational tees, polos, and daily layers from our catalog.
              </p>
            </div>
            <Link
              href="/products"
              className="text-body-sm font-bold text-brand transition hover:underline focus-visible:outline-2 focus-visible:outline-brand"
            >
              View all products &rarr;
            </Link>
          </div>

          {featuredCollection.length === 0 ? (
            <div className="mt-8 rounded-md border border-dashed border-field-border bg-surface p-12 text-center text-neutral-600">
              <p className="font-semibold text-brand">Products are temporarily unavailable.</p>
              <p className="mt-1 text-body-sm">Please try again shortly.</p>
            </div>
          ) : (
            <ProductGrid variant="home" className="mt-8">
              {featuredCollection.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          )}
        </div>
      </section>

      <BrandSection />

      {/* EVERYDAY ESSENTIALS (only when the catalog has more than 8 products) */}
      {everydayEssentials.length > 0 && (
        <section className="border-t border-line bg-surface-muted py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow className="text-neutral-600">Core Wardrobe</Eyebrow>
                <h2 className="mt-1 text-heading font-bold tracking-tight text-brand-strong">
                  Everyday Essentials
                </h2>
                <p className="mt-1 text-body-sm text-neutral-600">
                  Versatile staples designed for comfortable daily rotation.
                </p>
              </div>
              <Link
                href="/products"
                className="text-body-sm font-bold text-brand transition hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              >
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
