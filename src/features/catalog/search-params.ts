import type { ProductFilters } from "./api";

export type CatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function parseProductFilters(
  searchParams: CatalogSearchParams,
): ProductFilters {
  return {
    q: readFilter(searchParams.q),
    category: readFilter(searchParams.category),
    brand: readFilter(searchParams.brand),
  };
}

export function hasProductFilters(filters: ProductFilters): boolean {
  return Boolean(filters.q || filters.category || filters.brand);
}

function readFilter(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized || undefined;
}
