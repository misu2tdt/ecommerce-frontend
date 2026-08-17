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

function buildCatalogQuery(filters: ProductFilters): string {
  const query = new URLSearchParams();

  if (filters.q) query.set("q", filters.q);
  if (filters.category) query.set("category", filters.category);
  if (filters.brand) query.set("brand", filters.brand);

  return query.toString();
}

function readFilter(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized || undefined;
}
