"use client";

import { Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogFilterOptions } from "@/types/catalog";
import type { ProductFilters } from "@/features/catalog/api";
import { formatVnd } from "@/lib/money";

interface ActiveFilterChipsProps {
  filters: ProductFilters;
  options: CatalogFilterOptions;
}

export function ActiveFilterChips(props: ActiveFilterChipsProps) {
  return (
    <Suspense fallback={null}>
      <ActiveFilterChipsContent {...props} />
    </Suspense>
  );
}

function ActiveFilterChipsContent({ filters, options }: ActiveFilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const chips: Array<{
    id: string;
    label: string;
    onRemove: () => void;
  }> = [];

  const updateUrl = (modifier: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    modifier(params);
    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `/products?${queryString}` : "/products");
    });
  };

  // Search text chip
  if (filters.q) {
    chips.push({
      id: `q-${filters.q}`,
      label: `Search: "${filters.q}"`,
      onRemove: () => updateUrl((p) => p.delete("q")),
    });
  }

  // Category chip
  if (filters.category) {
    const matchedCategory = options.categories.find(
      (c) => c.slug === filters.category,
    );
    chips.push({
      id: `cat-${filters.category}`,
      label: `Category: ${matchedCategory?.name ?? filters.category}`,
      onRemove: () => updateUrl((p) => p.delete("category")),
    });
  }

  // Brand chip
  if (filters.brand) {
    const matchedBrand = options.brands.find((b) => b.slug === filters.brand);
    chips.push({
      id: `brand-${filters.brand}`,
      label: `Brand: ${matchedBrand?.name ?? filters.brand}`,
      onRemove: () => updateUrl((p) => p.delete("brand")),
    });
  }

  // Size chips
  if (filters.size && filters.size.length > 0) {
    for (const size of filters.size) {
      chips.push({
        id: `size-${size}`,
        label: `Size: ${size}`,
        onRemove: () =>
          updateUrl((p) => {
            const remaining = (filters.size ?? []).filter((s) => s !== size);
            p.delete("size");
            remaining.forEach((s) => p.append("size", s));
          }),
      });
    }
  }

  // Color chips
  if (filters.color && filters.color.length > 0) {
    for (const color of filters.color) {
      chips.push({
        id: `color-${color}`,
        label: `Color: ${color}`,
        onRemove: () =>
          updateUrl((p) => {
            const remaining = (filters.color ?? []).filter((c) => c !== color);
            p.delete("color");
            remaining.forEach((c) => p.append("color", c));
          }),
      });
    }
  }

  // Price range chip
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    let priceLabel = "";
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      priceLabel = `Price: ${formatVnd(filters.minPrice)} – ${formatVnd(filters.maxPrice)}`;
    } else if (filters.minPrice !== undefined) {
      priceLabel = `Min Price: ${formatVnd(filters.minPrice)}`;
    } else if (filters.maxPrice !== undefined) {
      priceLabel = `Max Price: ${formatVnd(filters.maxPrice)}`;
    }

    chips.push({
      id: "price-range",
      label: priceLabel,
      onRemove: () =>
        updateUrl((p) => {
          p.delete("minPrice");
          p.delete("maxPrice");
        }),
    });
  }

  // In stock chip
  if (filters.inStock) {
    chips.push({
      id: "in-stock",
      label: "In Stock Only",
      onRemove: () => updateUrl((p) => p.delete("inStock")),
    });
  }

  if (chips.length === 0) return null;

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    // Clear all filters except sort
    params.delete("q");
    params.delete("category");
    params.delete("brand");
    params.delete("size");
    params.delete("color");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("inStock");

    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `/products?${queryString}` : "/products");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-body-sm font-semibold text-neutral-600">Active filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-brand-soft py-1 pl-3 pr-2 text-caption font-semibold text-brand"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            disabled={isPending}
            onClick={chip.onRemove}
            aria-label={`Remove filter ${chip.label}`}
            className="flex h-4 w-4 items-center justify-center rounded-full text-brand hover:bg-neutral-200 hover:text-brand-strong focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        disabled={isPending}
        onClick={handleClearAll}
        className="text-body-sm font-semibold text-brand underline underline-offset-2 transition hover:text-brand-strong focus:outline-none focus:ring-2 focus:ring-brand rounded px-1 disabled:opacity-50"
      >
        Clear all
      </button>
    </div>
  );
}
