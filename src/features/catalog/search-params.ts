import type { ProductSort } from "@/types/catalog";
import type { ProductFilters } from "./api";

export type CatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;

// The sort values the backend's ProductSort enum accepts.
export const VALID_SORTS: ProductSort[] = [
  "featured",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "newest",
];

export function parseProductFilters(
  searchParams: CatalogSearchParams,
): ProductFilters {
  const minPriceNum = readNumber(searchParams.minPrice);
  const maxPriceNum = readNumber(searchParams.maxPrice);
  const rawSort = readFilter(searchParams.sort);
  const sort =
    rawSort && VALID_SORTS.includes(rawSort as ProductSort)
      ? (rawSort as ProductSort)
      : undefined;

  return {
    q: readFilter(searchParams.q),
    category: readFilter(searchParams.category),
    brand: readFilter(searchParams.brand),
    size: readArrayFilter(searchParams.size),
    color: readArrayFilter(searchParams.color),
    minPrice: minPriceNum,
    maxPrice: maxPriceNum,
    inStock: readBooleanFilter(searchParams.inStock),
    sort,
  };
}

export function hasProductFilters(filters: ProductFilters): boolean {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.brand ||
      (filters.size && filters.size.length > 0) ||
      (filters.color && filters.color.length > 0) ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.inStock === true ||
      (filters.sort && filters.sort !== "featured"),
  );
}

export function countActiveFilters(filters: ProductFilters): number {
  let count = 0;
  if (filters.q) count++;
  if (filters.category) count++;
  if (filters.brand) count++;
  if (filters.size) count += filters.size.length;
  if (filters.color) count += filters.color.length;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
  if (filters.inStock) count++;
  return count;
}

export function buildCatalogHref(filters: ProductFilters): string {
  const query = buildCatalogQuery(filters);
  return query ? `/products?${query}` : "/products";
}

export function buildProductDetailHref(
  slug: string,
  filters: ProductFilters,
): string {
  const query = buildCatalogQuery(filters);
  const pathname = `/products/${encodeURIComponent(slug)}`;
  return query ? `${pathname}?${query}` : pathname;
}

export function buildCatalogQuery(filters: ProductFilters): string {
  const query = new URLSearchParams();

  if (filters.q) query.set("q", filters.q);
  if (filters.category) query.set("category", filters.category);
  if (filters.brand) query.set("brand", filters.brand);

  if (filters.size && filters.size.length > 0) {
    for (const s of filters.size) {
      query.append("size", s);
    }
  }

  if (filters.color && filters.color.length > 0) {
    for (const c of filters.color) {
      query.append("color", c);
    }
  }

  if (filters.minPrice !== undefined) {
    query.set("minPrice", String(Math.floor(filters.minPrice)));
  }

  if (filters.maxPrice !== undefined) {
    query.set("maxPrice", String(Math.floor(filters.maxPrice)));
  }

  if (filters.inStock === true) {
    query.set("inStock", "true");
  }

  if (filters.sort && filters.sort !== "featured") {
    query.set("sort", filters.sort);
  }

  return query.toString();
}

function readFilter(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized || undefined;
}

function readArrayFilter(
  value: string | string[] | undefined,
): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const rawList = Array.isArray(value) ? value : [value];
  const result: string[] = [];

  for (const item of rawList) {
    if (!item) continue;
    const parts = String(item)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    result.push(...parts);
  }

  const unique = Array.from(new Set(result));
  return unique.length > 0 ? unique : undefined;
}

function readNumber(value: string | string[] | undefined): number | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.trim()) return undefined;
  const parsed = Number(candidate.trim());
  return !isNaN(parsed) && isFinite(parsed) && parsed >= 0
    ? Math.floor(parsed)
    : undefined;
}

function readBooleanFilter(
  value: string | string[] | undefined,
): boolean | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "true" || candidate === "1") return true;
  if (candidate === "false" || candidate === "0") return false;
  return undefined;
}
