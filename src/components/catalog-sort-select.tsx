"use client";

import { Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductSort } from "@/types/catalog";

interface CatalogSortSelectProps {
  currentSort?: ProductSort;
}

export function CatalogSortSelect(props: CatalogSortSelectProps) {
  return (
    <Suspense fallback={<CatalogSortSelectFallback currentSort={props.currentSort} />}>
      <CatalogSortSelectContent {...props} />
    </Suspense>
  );
}

function CatalogSortSelectFallback({ currentSort = "featured" }: CatalogSortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
        Sort by:
      </span>
      <div className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-800 opacity-60">
        {currentSort === "price_asc"
          ? "Price: Low to High"
          : currentSort === "price_desc"
            ? "Price: High to Low"
            : currentSort === "name_asc"
              ? "Name: A to Z"
              : currentSort === "name_desc"
                ? "Name: Z to A"
                : currentSort === "newest"
                  ? "Newest Arrivals"
                  : "Default"}
      </div>
    </div>
  );
}

function CatalogSortSelectContent({ currentSort = "featured" }: CatalogSortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort === "featured") {
      params.delete("sort");
    } else {
      params.set("sort", newSort);
    }
    const queryString = params.toString();
    startTransition(() => {
      router.push(queryString ? `/products?${queryString}` : "/products");
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="catalog-sort-select"
        className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
      >
        Sort by:
      </label>
      <div className="relative">
        <select
          id="catalog-sort-select"
          aria-label="Sort products by"
          disabled={isPending}
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 disabled:opacity-50"
        >
          <option value="featured">Default</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A to Z</option>
          <option value="name_desc">Name: Z to A</option>
          <option value="newest">Newest Arrivals</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
