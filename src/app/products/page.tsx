import type { Metadata } from "next";
import { ActiveFilterChips } from "@/components/active-filter-chips";
import { CatalogSidebar } from "@/components/catalog-sidebar";
import { CatalogSortSelect } from "@/components/catalog-sort-select";
import { FeedbackState } from "@/components/feedback-state";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { ProductCard } from "@/components/product-card";
import {
  getCatalogFilterOptions,
  getProducts,
  type ProductFilters,
} from "@/features/catalog/api";
import {
  hasProductFilters,
  parseProductFilters,
  type CatalogSearchParams,
} from "@/features/catalog/search-params";
import type { CatalogFilterOptions, ProductSummary } from "@/types/catalog";

import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = {
  title: "Shop All Products | Everyday Essentials & Activewear",
  description:
    "Explore our complete fashion catalog of breathable t-shirts, activewear, everyday pants, and minimalist outerwear.",
};

interface CatalogData {
  products: ProductSummary[];
  filterOptions: CatalogFilterOptions;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const filters = parseProductFilters(await searchParams);
  const activeFilters = hasProductFilters(filters);
  const result = await loadCatalog(filters);

  if ("error" in result) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FeedbackState
          title="Products temporarily unavailable"
          description="Products are temporarily unavailable. Please try again shortly."
          actionHref="/products"
          actionLabel="Try again"
        />
      </section>
    );
  }

  const { products, filterOptions } = result.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-line pb-6">
        <Eyebrow>
          Curated Wardrobe
        </Eyebrow>
        <h1 className="mt-1 font-bold tracking-tight text-brand text-display">
          Everyday Performance & Essentials
        </h1>
        <p className="mt-2 max-w-3xl text-body-sm text-neutral-600">
          Explore versatile fabrics, breathable activewear, and timeless wardrobe
          staples designed for all-day comfort.
        </p>
      </div>

      {/* Main Catalog Layout */}
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Desktop Filter Sidebar */}
        <div className="hidden w-64 shrink-0 rounded-md border border-line bg-surface p-6 lg:block">
          <CatalogSidebar
            filters={filters}
            options={filterOptions}
            idPrefix="desktop-filter"
          />
        </div>

        {/* Product Grid & Controls */}
        <div className="flex-1 min-w-0">
          {/* Top Control Bar */}
          <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <MobileFilterDrawer filters={filters} options={filterOptions} />
              <p
                className="text-body-sm font-semibold text-neutral-600"
                role="status"
                aria-live="polite"
              >
                Showing {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
                {activeFilters && " matching filters"}
              </p>
            </div>

            <CatalogSortSelect currentSort={filters.sort} />
          </div>

          {/* Active Filter Chips */}
          <div className="mb-6">
            <ActiveFilterChips filters={filters} options={filterOptions} />
          </div>

          {/* Results Display */}
          {products.length === 0 ? (
            <div className="py-12">
              <FeedbackState
                title={
                  activeFilters
                    ? "No products match these filters"
                    : "Products are temporarily unavailable"
                }
                description={
                  activeFilters
                    ? "Try adjusting your category, size, color, or price range filters."
                    : "Products are temporarily unavailable. Please try again shortly."
                }
                actionHref="/products"
                actionLabel={
                  activeFilters ? "Clear all filters" : "Browse all products"
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  filters={filters}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function loadCatalog(
  filters: ProductFilters,
): Promise<{ data: CatalogData } | { error: true }> {
  try {
    const [products, filterOptions] = await Promise.all([
      getProducts(filters),
      getCatalogFilterOptions(),
    ]);
    return { data: { products, filterOptions } };
  } catch {
    return { error: true };
  }
}
