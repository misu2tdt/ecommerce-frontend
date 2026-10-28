import Link from "next/link";
import type { ProductFilters } from "@/features/catalog/api";
import type { Brand, Category } from "@/types/catalog";

import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
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
      className="rounded-md border border-line bg-surface p-5 sm:p-6"
      aria-label="Filter products"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-[minmax(15rem,1.5fr)_1fr_1fr]">
        <div>
          <label
            htmlFor="catalog-search"
            className="block text-body-sm font-semibold text-neutral-800"
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
            className={fieldStyles("mt-2")}
          />
        </div>

        <div>
          <label
            htmlFor="catalog-category"
            className="block text-body-sm font-semibold text-neutral-800"
          >
            Category
          </label>
          <select
            id="catalog-category"
            name="category"
            defaultValue={filters.category ?? ""}
            className={fieldStyles("mt-2")}
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
            className="block text-body-sm font-semibold text-neutral-800"
          >
            Brand
          </label>
          <select
            id="catalog-brand"
            name="brand"
            defaultValue={filters.brand ?? ""}
            className={fieldStyles("mt-2")}
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
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          Apply filters
        </button>
        {active ? (
          <Link
            href="/products"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Clear filters
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-5 py-2.5 font-semibold text-neutral-500">
            Clear filters
          </span>
        )}
      </div>
    </form>
  );
}
