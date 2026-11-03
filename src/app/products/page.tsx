import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActiveFilterChips } from "@/components/active-filter-chips";
import { CatalogSidebar } from "@/components/catalog-sidebar";
import { CatalogSortSelect } from "@/components/catalog-sort-select";
import { FeedbackState } from "@/components/feedback-state";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { PageFocus } from "@/components/page-focus";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { ProductGrid } from "@/components/product-grid";
import {
  getCatalogFilterOptions,
  getProductsPage,
  type ProductFilters,
} from "@/features/catalog/api";
import {
  buildCatalogHref,
  hasProductFilters,
  parseProductFilters,
  type CatalogSearchParams,
} from "@/features/catalog/search-params";
import {
  pageRange,
  pageRedirectTarget,
  parsePageParam,
  type PaginationInfo,
} from "@/lib/pagination";
import type { CatalogFilterOptions, ProductSummary } from "@/types/catalog";

import { catalogMetadata } from "@/lib/seo";
import { Eyebrow } from "@/components/ui/eyebrow";
// Title, description and canonical address follow the category, brand, search
// and page of the address.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const query = await searchParams;
  return catalogMetadata({
    filters: parseProductFilters(query),
    page: parsePageParam(query.page).page,
  });
}

interface CatalogData {
  products: ProductSummary[];
  pagination: PaginationInfo;
  filterOptions: CatalogFilterOptions;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const query = await searchParams;
  const filters = parseProductFilters(query);
  const activeFilters = hasProductFilters(filters);
  const pageParam = parsePageParam(query.page);
  const result = await loadCatalog(filters, pageParam.page);

  if ("error" in result) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <FeedbackState
          as="h1"
          title="Products temporarily unavailable"
          description="Products are temporarily unavailable. Please try again shortly."
          actionHref="/products"
          actionLabel="Try again"
        />
      </section>
    );
  }

  const { products, pagination, filterOptions } = result.data;

  // An unusable page (not a number, or past the last page) goes to a real one.
  const redirectPage = pageRedirectTarget(pageParam, pagination.totalPages);
  if (redirectPage !== null) redirect(buildCatalogHref(filters, redirectPage));

  const { from, to } = pageRange(pageParam.page, pagination.limit, pagination.total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-line pb-6">
        <Eyebrow>
          Shop
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
                {pagination.total === 0
                  ? "No products"
                  : pagination.totalPages > 1
                    ? `Showing ${from}–${to} of ${pagination.total} products`
                    : `Showing ${pagination.total} ${pagination.total === 1 ? "product" : "products"}`}
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
            <>
              {/* Where focus goes after a page change (see PageFocus). */}
              <h2
                id="catalog-results"
                tabIndex={-1}
                className="sr-only focus:outline-none"
              >
                Products, page {pageParam.page} of {pagination.totalPages}
              </h2>
              <Suspense fallback={null}>
                <PageFocus targetId="catalog-results" />
              </Suspense>
              <ProductGrid>
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    filters={filters}
                    headingLevel="h3"
                    priority={index < 4}
                  />
                ))}
              </ProductGrid>
              <Pagination
                page={pageParam.page}
                totalPages={pagination.totalPages}
                hrefFor={(page) => buildCatalogHref(filters, page)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

async function loadCatalog(
  filters: ProductFilters,
  page: number,
): Promise<{ data: CatalogData } | { error: true }> {
  try {
    const [{ items: products, ...pagination }, filterOptions] =
      await Promise.all([
        getProductsPage(filters, page),
        getCatalogFilterOptions(),
      ]);
    return { data: { products, pagination, filterOptions } };
  } catch {
    return { error: true };
  }
}
