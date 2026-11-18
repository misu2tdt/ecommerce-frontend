import { PRICE_MAX_VND } from "@/lib/limits";
import { formatVnd } from "@/lib/money";
import type { CatalogFilterOptions } from "@/types/catalog";
import type { ProductFilters } from "./api";

// What the catalog's filter controls do, in one place. The filter bar (desktop)
// and the filter list in the phone drawer both build their options and their new
// addresses from here, so the two cannot drift apart. No React in this file.

export const CATALOG_PATH = "/products";

// A change to the address's query string.
export type ParamsEdit = (params: URLSearchParams) => void;

// The address after an edit. Any change of filters starts again from the first
// page, so `page` is always dropped; every other parameter is kept.
export function catalogHrefFor(
  current: { toString(): string },
  edit: ParamsEdit,
): string {
  const params = new URLSearchParams(current.toString());
  params.delete("page");
  edit(params);
  const query = params.toString();
  return query ? `${CATALOG_PATH}?${query}` : CATALOG_PATH;
}

// ---- the edits ------------------------------------------------------------------

// One choice for a group (category, brand); no value clears the group.
export const setSingle =
  (key: "category" | "brand", value?: string): ParamsEdit =>
  (params) => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

// Adds the value to a group that takes several (size, colour), or removes it.
export const toggleMulti =
  (key: "size" | "color", current: readonly string[], value: string): ParamsEdit =>
  (params) => {
    params.delete(key);
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    for (const entry of next) params.append(key, entry);
  };

export const clearKey =
  (...keys: string[]): ParamsEdit =>
  (params) => {
    for (const key of keys) params.delete(key);
  };

// The two price boxes. A box that is empty, not a number, below 0 or above the
// backend's limit is left out (the backend would refuse it); a price has no
// fractions.
export const setPriceRange =
  (minRaw: string, maxRaw: string): ParamsEdit =>
  (params) => {
    for (const [key, raw] of [
      ["minPrice", minRaw],
      ["maxPrice", maxRaw],
    ] as const) {
      const text = raw.trim();
      const value = text ? Math.floor(Number(text)) : NaN;
      if (text && Number.isFinite(value) && value >= 0 && value <= PRICE_MAX_VND) {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    }
  };

export const setPricePreset =
  (min?: number, max?: number): ParamsEdit =>
  (params) => {
    if (min !== undefined) params.set("minPrice", String(min));
    else params.delete("minPrice");
    if (max !== undefined) params.set("maxPrice", String(max));
    else params.delete("maxPrice");
  };

export const setInStock =
  (checked: boolean): ParamsEdit =>
  (params) => {
    if (checked) params.set("inStock", "true");
    else params.delete("inStock");
  };

// Every filter off; the sort stays.
export const clearAllFilters: ParamsEdit = clearKey(
  "q",
  "category",
  "brand",
  "size",
  "color",
  "minPrice",
  "maxPrice",
  "inStock",
);

// ---- the options ------------------------------------------------------------------

export interface PricePreset {
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_PRESETS: readonly PricePreset[] = [
  { label: `Under ${formatVnd(250000)}`, max: 250000 },
  { label: "250k – 500k", min: 250000, max: 500000 },
  { label: `Over ${formatVnd(500000)}`, min: 500000 },
];

// A choice in a group of one-of-many (category, brand). The first one, "All ...",
// has no value and is selected when nothing is.
export interface Choice {
  value: string | undefined;
  label: string;
  selected: boolean;
}

function singleChoices(
  allLabel: string,
  selected: string | undefined,
  items: ReadonlyArray<{ name: string; slug: string }>,
): Choice[] {
  return [
    { value: undefined, label: allLabel, selected: !selected },
    ...items.map((item) => ({
      value: item.slug,
      label: item.name,
      selected: selected === item.slug,
    })),
  ];
}

export const categoryChoices = (
  filters: ProductFilters,
  options: CatalogFilterOptions,
): Choice[] =>
  singleChoices("All Categories", filters.category, options.categories);

export const brandChoices = (
  filters: ProductFilters,
  options: CatalogFilterOptions,
): Choice[] => singleChoices("All Brands", filters.brand, options.brands);

// A choice in a group of many-of-many (size, colour).
export interface MultiChoice {
  value: string;
  selected: boolean;
}

export const sizeChoices = (
  filters: ProductFilters,
  options: CatalogFilterOptions,
): MultiChoice[] =>
  options.sizes.map((value) => ({
    value,
    selected: (filters.size ?? []).includes(value),
  }));

export const colorChoices = (
  filters: ProductFilters,
  options: CatalogFilterOptions,
): MultiChoice[] =>
  options.colors.map((value) => ({
    value,
    selected: (filters.color ?? []).includes(value),
  }));

// How many selections each group has (for the badge on its button). A price range
// counts once, whichever of its two ends are set; the search text is not a group.
export interface FacetCounts {
  category: number;
  brand: number;
  size: number;
  color: number;
  price: number;
  inStock: number;
}

export function facetCounts(filters: ProductFilters): FacetCounts {
  return {
    category: filters.category ? 1 : 0,
    brand: filters.brand ? 1 : 0,
    size: filters.size?.length ?? 0,
    color: filters.color?.length ?? 0,
    price:
      filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0,
    inStock: filters.inStock ? 1 : 0,
  };
}
