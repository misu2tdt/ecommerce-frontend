import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActiveFilterChips } from "@/components/active-filter-chips";
import { CatalogFilterBar } from "@/components/catalog-filter-bar";
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
  hasIgnoredPriceFilter,
  hasProductFilters,
  parseProductFilters,
  type CatalogSearchParams,
} from "@/features/catalog/search-params";
import { PRICE_MAX_VND } from "@/lib/limits";
import { formatVnd } from "@/lib/money";
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
  const priceIgnored = hasIgnoredPriceFilter(query);
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
      <div className="mt-8">
        <div className="min-w-0">
          {/* Top Control Bar. Below lg: the filter drawer button and the count,
              then the sort. From lg: the filter bar, then the count and the sort,
              all on one row that wraps when the screen is narrower. */}
          <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:gap-x-3 lg:gap-y-3">
            <div className="flex items-center gap-3 lg:contents">
              <MobileFilterDrawer filters={filters} options={filterOptions} />
              <ResultCount
                className="lg:hidden"
                total={pagination.total}
                totalPages={pagination.totalPages}
                from={from}
                to={to}
                filtered={activeFilters}
              />
              <CatalogFilterBar filters={filters} options={filterOptions} />
            </div>

            {/* From lg the count and the sort stay together on the right and wrap
                as one when the filters need the room. */}
            <div className="flex items-center gap-4 lg:ml-auto">
              <ResultCount
                className="hidden lg:block"
                total={pagination.total}
                totalPages={pagination.totalPages}
                from={from}
                to={to}
                filtered={activeFilters}
              />
              <CatalogSortSelect currentSort={filters.sort} />
            </div>
          </div>

          {/* Active Filter Chips */}
          <div className="mb-6">
            <ActiveFilterChips filters={filters} options={filterOptions} />
            {priceIgnored && (
              <p
                role="note"
                className="mt-3 rounded-md border border-line bg-surface-muted px-3 py-2 text-body-sm text-neutral-700"
              >
                <strong className="font-semibold text-brand-strong">
                  Price filter ignored.
                </strong>{" "}
                A price must be a number from 0 to {formatVnd(PRICE_MAX_VND)}.
              </p>
            )}
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

// "Showing 1–12 of 26 products". It is on the page twice, once for phones (beside
// the filter button) and once for desktop (beside the sort); only one is shown.
function ResultCount({
  className,
  total,
  totalPages,
  from,
  to,
  filtered,
}: {
  className: string;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  filtered: boolean;
}) {
  return (
    <p
      className={`text-body-sm font-semibold text-neutral-600 ${className}`}
      role="status"
      aria-live="polite"
    >
      {total === 0
        ? "No products"
        : totalPages > 1
          ? `Showing ${from}–${to} of ${total} products`
          : `Showing ${total} ${total === 1 ? "product" : "products"}`}
      {filtered && " matching filters"}
    </p>
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
