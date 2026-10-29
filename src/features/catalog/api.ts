import { apiFetch, type ApiQuery } from "@/lib/api";
import type {
  Brand,
  Category,
  CatalogFilterOptions,
  ProductDetail,
  ProductSort,
  ProductSummary,
} from "@/types/catalog";

export interface ProductFilters {
  category?: string;
  brand?: string;
  q?: string;
  size?: string[];
  color?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: ProductSort;
}

// The query parameters the backend's product list accepts (ProductQueryDto in
// the backend repo). The backend answers anything else with a 400, for example
// `limit` or `page`: the list has no pagination yet, so take the first N
// products on the frontend instead of asking for N.
export const PRODUCT_QUERY_PARAMS = [
  "q",
  "category",
  "brand",
  "size",
  "color",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
] as const;

export function buildProductsQuery(filters: ProductFilters): ApiQuery {
  return {
    q: filters.q,
    category: filters.category,
    brand: filters.brand,
    size: filters.size,
    color: filters.color,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    inStock: filters.inStock ? "true" : undefined,
    sort: filters.sort,
  } satisfies Record<(typeof PRODUCT_QUERY_PARAMS)[number], unknown>;
}

export function getProducts(
  filters: ProductFilters = {},
): Promise<ProductSummary[]> {
  return apiFetch<ProductSummary[]>("/products", {
    query: buildProductsQuery(filters),
  });
}

export function getCatalogFilterOptions(): Promise<CatalogFilterOptions> {
  return apiFetch<CatalogFilterOptions>("/products/filters");
}

export function getProductBySlug(slug: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(
    `/products/slug/${encodeURIComponent(slug)}`,
  );
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories");
}

export function getBrands(): Promise<Brand[]> {
  return apiFetch<Brand[]>("/brands");
}
