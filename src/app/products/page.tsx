import type { Metadata } from "next";
import { CatalogFilters } from "@/components/catalog-filters";
import { FeedbackState } from "@/components/feedback-state";
import { ProductCard } from "@/components/product-card";
import {
  getBrands,
  getCategories,
  getProducts,
  type ProductFilters,
} from "@/features/catalog/api";
import {
  hasProductFilters,
  parseProductFilters,
  type CatalogSearchParams,
} from "@/features/catalog/search-params";
import { apiErrorMessage } from "@/lib/api";
import type { Brand, Category, ProductSummary } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse and filter the current product catalog.",
};

interface CatalogData {
  products: ProductSummary[];
  categories: Category[];
  brands: Brand[];
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
      <section className="mx-auto max-w-6xl px-6 py-16">
        <FeedbackState
          title="Catalog unavailable"
          description={result.error}
        />
      </section>
    );
  }

  const { products, categories, brands } = result.data;
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Catalog
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Find your next device
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Search the live catalog and narrow results by category or brand.
        </p>
      </div>

      <CatalogFilters
        categories={categories}
        brands={brands}
        filters={filters}
        active={activeFilters}
      />

      <div className="mb-6 mt-9 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Catalog results</h2>
          <p className="mt-1 text-sm text-slate-600" role="status" aria-live="polite">
            {products.length} {products.length === 1 ? "product" : "products"}
            {activeFilters ? " match your filters" : " available"}
          </p>
        </div>
        {filters.q && (
          <p className="text-sm text-slate-500">
            Search: <span className="font-semibold text-slate-700">{filters.q}</span>
          </p>
        )}
      </div>

      {products.length === 0 ? (
        <FeedbackState
          title={activeFilters ? "No matching products" : "No products available"}
          description={
            activeFilters
              ? "Try a different search, category, or brand."
              : "The catalog is empty. Run the backend demo seed and refresh this page."
          }
          actionHref="/products"
          actionLabel={activeFilters ? "Clear filters" : "Refresh catalog"}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} filters={filters} />
          ))}
        </div>
      )}
    </section>
  );
}

async function loadCatalog(
  filters: ProductFilters,
): Promise<{ data: CatalogData } | { error: string }> {
  try {
    const [products, categories, brands] = await Promise.all([
      getProducts(filters),
      getCategories(),
      getBrands(),
    ]);
    return { data: { products, categories, brands } };
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }
}
