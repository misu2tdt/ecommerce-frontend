import Link from "next/link";
import type { ProductFilters } from "@/features/catalog/api";
import type { Brand, Category } from "@/types/catalog";

interface CatalogFiltersProps {
  categories: Category[];
  brands: Brand[];
  filters: ProductFilters;
  active: boolean;
}

export function CatalogFilters({
  categories,
  brands,
  filters,
  active,
}: CatalogFiltersProps) {
  return (
    <form
      action="/products"
      method="get"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-label="Filter products"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-[minmax(15rem,1.5fr)_1fr_1fr]">
        <div>
          <label
            htmlFor="catalog-search"
            className="block text-sm font-semibold text-slate-800"
          >
            Search
          </label>
          <input
            id="catalog-search"
            name="q"
            type="search"
            maxLength={255}
            defaultValue={filters.q}
            placeholder="Search product names"
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/25"
          />
        </div>

        <div>
          <label
            htmlFor="catalog-category"
            className="block text-sm font-semibold text-slate-800"
          >
            Category
          </label>
          <select
            id="catalog-category"
            name="category"
            defaultValue={filters.category ?? ""}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/25"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="catalog-brand"
            className="block text-sm font-semibold text-slate-800"
          >
            Brand
          </label>
          <select
            id="catalog-brand"
            name="brand"
            defaultValue={filters.brand ?? ""}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/25"
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          Apply filters
        </button>
        {active ? (
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
          >
            Clear filters
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-5 py-2.5 font-semibold text-slate-400">
            Clear filters
          </span>
        )}
      </div>
    </form>
  );
}
