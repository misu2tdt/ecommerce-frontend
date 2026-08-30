"use client";

import { Suspense, useId, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogFilterOptions } from "@/types/catalog";
import type { ProductFilters } from "@/features/catalog/api";
import { formatVnd } from "@/lib/money";

interface CatalogSidebarProps {
  filters: ProductFilters;
  options: CatalogFilterOptions;
  idPrefix?: string;
}

export function CatalogSidebar(props: CatalogSidebarProps) {
  return (
    <Suspense fallback={<CatalogSidebarFallback options={props.options} />}>
      <CatalogSidebarContent {...props} />
    </Suspense>
  );
}

function CatalogSidebarFallback({ options }: { options: CatalogFilterOptions }) {
  return (
    <aside className="w-full space-y-8 opacity-60" aria-label="Catalog filters">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3">
          Category
        </h3>
        <ul className="space-y-1.5 text-sm">
          {options.categories.map((cat) => (
            <li key={cat.id} className="px-2.5 py-1.5 text-slate-600">
              {cat.name}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function CatalogSidebarContent({
  filters,
  options,
  idPrefix,
}: CatalogSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const minPriceInputId = `${prefix}-min-price-input`;
  const maxPriceInputId = `${prefix}-max-price-input`;
  const inStockCheckboxId = `${prefix}-in-stock-checkbox`;

  // React pattern: adjust draft state when props change without effects
  const [minPriceDraft, setMinPriceDraft] = useState<string | null>(null);
  const [maxPriceDraft, setMaxPriceDraft] = useState<string | null>(null);
  const [prevMinPrice, setPrevMinPrice] = useState<number | undefined>(
    filters.minPrice,
  );
  const [prevMaxPrice, setPrevMaxPrice] = useState<number | undefined>(
    filters.maxPrice,
  );

  if (filters.minPrice !== prevMinPrice) {
    setPrevMinPrice(filters.minPrice);
    setMinPriceDraft(null);
  }
  if (filters.maxPrice !== prevMaxPrice) {
    setPrevMaxPrice(filters.maxPrice);
    setMaxPriceDraft(null);
  }

  const displayedMinPrice =
    minPriceDraft !== null
      ? minPriceDraft
      : filters.minPrice !== undefined
        ? String(filters.minPrice)
        : "";

  const displayedMaxPrice =
    maxPriceDraft !== null
      ? maxPriceDraft
      : filters.maxPrice !== undefined
        ? String(filters.maxPrice)
        : "";

  const updateUrl = (modifier: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    modifier(params);
    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `/products?${queryString}` : "/products");
    });
  };

  const handleCategorySelect = (categorySlug?: string) => {
    updateUrl((p) => {
      if (!categorySlug) {
        p.delete("category");
      } else {
        p.set("category", categorySlug);
      }
    });
  };

  const handleBrandSelect = (brandSlug?: string) => {
    updateUrl((p) => {
      if (!brandSlug) {
        p.delete("brand");
      } else {
        p.set("brand", brandSlug);
      }
    });
  };

  const handleSizeToggle = (size: string) => {
    updateUrl((p) => {
      const current = filters.size ?? [];
      p.delete("size");
      const next = current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size];
      next.forEach((s) => p.append("size", s));
    });
  };

  const handleColorToggle = (color: string) => {
    updateUrl((p) => {
      const current = filters.color ?? [];
      p.delete("color");
      const next = current.includes(color)
        ? current.filter((c) => c !== color)
        : [...current, color];
      next.forEach((c) => p.append("color", c));
    });
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl((p) => {
      const minRaw = displayedMinPrice.trim();
      const maxRaw = displayedMaxPrice.trim();
      const min = minRaw ? Math.floor(Number(minRaw)) : NaN;
      const max = maxRaw ? Math.floor(Number(maxRaw)) : NaN;

      if (minRaw && !isNaN(min) && isFinite(min) && min >= 0) {
        p.set("minPrice", String(min));
      } else {
        p.delete("minPrice");
      }
      if (maxRaw && !isNaN(max) && isFinite(max) && max >= 0) {
        p.set("maxPrice", String(max));
      } else {
        p.delete("maxPrice");
      }
    });
  };

  const handlePricePreset = (min?: number, max?: number) => {
    setMinPriceDraft(null);
    setMaxPriceDraft(null);
    updateUrl((p) => {
      if (min !== undefined) {
        p.set("minPrice", String(min));
      } else {
        p.delete("minPrice");
      }
      if (max !== undefined) {
        p.set("maxPrice", String(max));
      } else {
        p.delete("maxPrice");
      }
    });
  };

  const handleInStockToggle = (checked: boolean) => {
    updateUrl((p) => {
      if (checked) {
        p.set("inStock", "true");
      } else {
        p.delete("inStock");
      }
    });
  };

  const selectedSizes = filters.size ?? [];
  const selectedColors = filters.color ?? [];

  return (
    <aside className="w-full space-y-8" aria-label="Catalog filters">
      {/* Categories Facet */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3">
          Category
        </h3>
        <ul className="space-y-1.5 text-sm">
          <li>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCategorySelect(undefined)}
              className={`block w-full text-left rounded-md px-2.5 py-1.5 transition ${
                !filters.category
                  ? "bg-emerald-50 font-semibold text-emerald-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              All Categories
            </button>
          </li>
          {options.categories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCategorySelect(cat.slug)}
                className={`block w-full text-left rounded-md px-2.5 py-1.5 transition ${
                  filters.category === cat.slug
                    ? "bg-emerald-50 font-semibold text-emerald-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Brands Facet */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3">
          Brand
        </h3>
        <ul className="space-y-1.5 text-sm">
          <li>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleBrandSelect(undefined)}
              className={`block w-full text-left rounded-md px-2.5 py-1.5 transition ${
                !filters.brand
                  ? "bg-emerald-50 font-semibold text-emerald-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              All Brands
            </button>
          </li>
          {options.brands.map((brand) => (
            <li key={brand.id}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleBrandSelect(brand.slug)}
                className={`block w-full text-left rounded-md px-2.5 py-1.5 transition ${
                  filters.brand === brand.slug
                    ? "bg-emerald-50 font-semibold text-emerald-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {brand.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Sizes Facet */}
      {options.sizes.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Size
            </h3>
            {selectedSizes.length > 0 && (
              <button
                type="button"
                onClick={() => updateUrl((p) => p.delete("size"))}
                className="text-xs text-slate-500 hover:text-emerald-700 underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {options.sizes.map((size) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSizeToggle(size)}
                  aria-pressed={isSelected}
                  className={`flex h-10 items-center justify-center rounded-lg border text-xs font-semibold uppercase transition focus:outline-none focus:ring-2 focus:ring-emerald-700 ${
                    isSelected
                      ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colors Facet */}
      {options.colors.length > 0 && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Color
            </h3>
            {selectedColors.length > 0 && (
              <button
                type="button"
                onClick={() => updateUrl((p) => p.delete("color"))}
                className="text-xs text-slate-500 hover:text-emerald-700 underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {options.colors.map((color) => {
              const isSelected = selectedColors.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleColorToggle(color)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-700 ${
                    isSelected
                      ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <span>{color}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Facet */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3">
          Price Range (VND)
        </h3>
        <div className="space-y-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handlePricePreset(undefined, 250000)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Under {formatVnd(250000)}
            </button>
            <button
              type="button"
              onClick={() => handlePricePreset(250000, 500000)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              250k – 500k
            </button>
            <button
              type="button"
              onClick={() => handlePricePreset(500000, undefined)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Over {formatVnd(500000)}
            </button>
          </div>
        </div>
        <form onSubmit={handlePriceApply} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={minPriceInputId} className="sr-only">
                Minimum price in VND
              </label>
              <input
                id={minPriceInputId}
                type="number"
                min="0"
                step="10000"
                placeholder="Min ₫"
                value={displayedMinPrice}
                onChange={(e) => setMinPriceDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label htmlFor={maxPriceInputId} className="sr-only">
                Maximum price in VND
              </label>
              <input
                id={maxPriceInputId}
                type="number"
                min="0"
                step="10000"
                placeholder="Max ₫"
                value={displayedMaxPrice}
                onChange={(e) => setMaxPriceDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
          >
            Apply Price
          </button>
        </form>
      </div>

      {/* In-Stock Filter */}
      <div className="border-t border-slate-200 pt-6">
        <label
          htmlFor={inStockCheckboxId}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <input
            id={inStockCheckboxId}
            type="checkbox"
            checked={Boolean(filters.inStock)}
            onChange={(e) => handleInStockToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
          />
          <span className="text-sm font-semibold text-slate-800">
            In stock only
          </span>
        </label>
      </div>
    </aside>
  );
}
