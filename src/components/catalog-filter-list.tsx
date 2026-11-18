"use client";

import { Suspense, useId } from "react";
import type { CatalogFilterOptions } from "@/types/catalog";
import type { ProductFilters } from "@/features/catalog/api";
import {
  PRICE_PRESETS,
  brandChoices,
  categoryChoices,
  clearKey,
  colorChoices,
  setInStock,
  setPricePreset,
  setPriceRange,
  setSingle,
  sizeChoices,
  toggleMulti,
} from "@/features/catalog/filter-edits";
import { PRICE_MAX_VND } from "@/lib/limits";
import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useCatalogFilterUrl, usePriceDraft } from "./use-catalog-filter";

// The catalog's filters as one stacked list, for the phone drawer (the desktop
// page has the filter bar instead). Options and address changes come from
// features/catalog/filter-edits.ts, shared with the bar.
interface CatalogFilterListProps {
  filters: ProductFilters;
  options: CatalogFilterOptions;
  idPrefix?: string;
}

export function CatalogFilterList(props: CatalogFilterListProps) {
  return (
    <Suspense fallback={<CatalogFilterListFallback options={props.options} />}>
      <CatalogFilterListContent {...props} />
    </Suspense>
  );
}

function CatalogFilterListFallback({ options }: { options: CatalogFilterOptions }) {
  return (
    <aside className="w-full space-y-8 opacity-60" aria-label="Catalog filters">
      <div>
        <Eyebrow as="h3" className="mb-3">
          Category
        </Eyebrow>
        <ul className="space-y-1.5 text-body-sm">
          {options.categories.map((cat) => (
            <li key={cat.id} className="px-2.5 py-1.5 text-neutral-600">
              {cat.name}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function CatalogFilterListContent({
  filters,
  options,
  idPrefix,
}: CatalogFilterListProps) {
  const { isPending, apply } = useCatalogFilterUrl();
  const price = usePriceDraft(filters.minPrice, filters.maxPrice);

  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const minPriceInputId = `${prefix}-min-price-input`;
  const maxPriceInputId = `${prefix}-max-price-input`;
  const inStockCheckboxId = `${prefix}-in-stock-checkbox`;

  const selectedSizes = filters.size ?? [];
  const selectedColors = filters.color ?? [];

  return (
    <aside className="w-full space-y-8" aria-label="Catalog filters">
      {/* Categories Facet */}
      <div>
        <Eyebrow as="h3" className="mb-3">
          Category
        </Eyebrow>
        <ul className="space-y-1.5 text-body-sm">
          {categoryChoices(filters, options).map((choice) => (
            <li key={choice.value ?? "all"}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => apply(setSingle("category", choice.value))}
                className={`block w-full text-left rounded-md px-2.5 py-1.5 transition ${
                  choice.selected
                    ? "bg-brand-soft font-semibold text-brand-strong"
                    : "text-neutral-600 hover:bg-surface-muted hover:text-brand"
                }`}
              >
                {choice.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Brands Facet */}
      <div className="border-t border-line pt-6">
        <Eyebrow as="h3" className="mb-3">
          Brand
        </Eyebrow>
        <ul className="space-y-1.5 text-body-sm">
          {brandChoices(filters, options).map((choice) => (
            <li key={choice.value ?? "all"}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => apply(setSingle("brand", choice.value))}
                className={`block w-full text-left rounded-md px-2.5 py-1.5 transition ${
                  choice.selected
                    ? "bg-brand-soft font-semibold text-brand-strong"
                    : "text-neutral-600 hover:bg-surface-muted hover:text-brand"
                }`}
              >
                {choice.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Sizes Facet */}
      {options.sizes.length > 0 && (
        <div className="border-t border-line pt-6">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow as="h3">
              Size
            </Eyebrow>
            {selectedSizes.length > 0 && (
              <button
                type="button"
                onClick={() => apply(clearKey("size"))}
                className="text-body-sm text-neutral-600 hover:text-brand underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {sizeChoices(filters, options).map((choice) => (
              <button
                key={choice.value}
                type="button"
                disabled={isPending}
                onClick={() => apply(toggleMulti("size", selectedSizes, choice.value))}
                aria-pressed={choice.selected}
                className={`flex h-10 items-center justify-center rounded-md border text-body-sm font-semibold uppercase transition focus:outline-none focus:ring-2 focus:ring-brand ${
                  choice.selected
                    ? "border-brand bg-brand text-white"
                    : "border-field-border bg-surface text-neutral-800 hover:border-neutral-400 hover:bg-surface-muted"
                }`}
              >
                {choice.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Colors Facet */}
      {options.colors.length > 0 && (
        <div className="border-t border-line pt-6">
          <div className="flex items-center justify-between mb-3">
            <Eyebrow as="h3">
              Color
            </Eyebrow>
            {selectedColors.length > 0 && (
              <button
                type="button"
                onClick={() => apply(clearKey("color"))}
                className="text-body-sm text-neutral-600 hover:text-brand underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {colorChoices(filters, options).map((choice) => (
              <button
                key={choice.value}
                type="button"
                disabled={isPending}
                onClick={() => apply(toggleMulti("color", selectedColors, choice.value))}
                aria-pressed={choice.selected}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand ${
                  choice.selected
                    ? "border-brand bg-brand text-white"
                    : "border-field-border bg-surface text-neutral-700 hover:border-neutral-400 hover:bg-surface-muted"
                }`}
              >
                <span>{choice.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range Facet */}
      <div className="border-t border-line pt-6">
        <Eyebrow as="h3" className="mb-3">
          Price Range (VND)
        </Eyebrow>
        <div className="space-y-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  price.reset();
                  apply(setPricePreset(preset.min, preset.max));
                }}
                className="rounded-md border border-line bg-surface-muted px-2 py-1 text-body-sm text-neutral-700 hover:bg-brand-soft hover:text-brand"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply(setPriceRange(price.min, price.max));
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={minPriceInputId} className="sr-only">
                Minimum price in VND
              </label>
              <input
                id={minPriceInputId}
                type="number"
                min="0"
                max={PRICE_MAX_VND}
                step="10000"
                placeholder="Min ₫"
                value={price.min}
                onChange={(e) => price.setMin(e.target.value)}
                className={fieldStyles()}
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
                max={PRICE_MAX_VND}
                step="10000"
                placeholder="Max ₫"
                value={price.max}
                onChange={(e) => price.setMax(e.target.value)}
                className={fieldStyles()}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={buttonStyles({ variant: "primary", size: "md", className: "w-full" })}
          >
            Apply Price
          </button>
        </form>
      </div>

      {/* In-Stock Filter */}
      <div className="border-t border-line pt-6">
        <label
          htmlFor={inStockCheckboxId}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <input
            id={inStockCheckboxId}
            type="checkbox"
            checked={Boolean(filters.inStock)}
            onChange={(e) => apply(setInStock(e.target.checked))}
            className="h-4 w-4 rounded border-field-border text-brand focus:ring-brand"
          />
          <span className="text-body-sm font-semibold text-neutral-800">
            In stock only
          </span>
        </label>
      </div>
    </aside>
  );
}
