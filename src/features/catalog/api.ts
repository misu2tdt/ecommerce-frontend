import { apiFetch, apiFetchPage, type ApiQuery } from "@/lib/api";
import { CATALOG_PAGE_SIZE, type PaginationInfo } from "@/lib/pagination";
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
  // The slug of a collection. Only the collection pages and the home page set
  // it; the catalog's own address does not carry it (see parseProductFilters).
  collection?: string;
  q?: string;
  size?: string[];
  color?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: ProductSort;
}

// The filter parameters the backend's product list accepts (ProductQueryDto in
// the backend repo). The backend answers any parameter it does not know with a
// 400. `page` and `limit` are accepted too, but only getProductsPage sends them:
// a plain getProducts() asks for the whole list.
export const PRODUCT_QUERY_PARAMS = [
  "q",
  "category",
  "brand",
  "collection",
  "size",
  "color",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
] as const;

// Sent only by getProductsPage.
export const PRODUCT_PAGE_PARAMS = ["page", "limit"] as const;

export function buildProductsQuery(filters: ProductFilters): ApiQuery {
  return {
    q: filters.q,
    category: filters.category,
    brand: filters.brand,
    collection: filters.collection,
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

// One page of the catalog (12 products), with the totals for the pager.
export function getProductsPage(
  filters: ProductFilters,
  page: number,
): Promise<{ items: ProductSummary[] } & PaginationInfo> {
  return apiFetchPage<ProductSummary>(
    "/products",
    { query: buildProductsQuery(filters) },
    { page, limit: CATALOG_PAGE_SIZE },
  );
}

// Every product page address, by asking for the list page by page (48 at a time,
// the most the backend gives). Used by the sitemap.
export async function getAllProductSlugs(): Promise<
  Array<{ slug: string; updatedAt: string }>
> {
  const products: Array<{ slug: string; updatedAt: string }> = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const result = await apiFetchPage<ProductSummary>(
      "/products",
      {},
      { page, limit: 48 },
    );
    totalPages = result.totalPages;
    products.push(
      ...result.items.map(({ slug, updatedAt }) => ({ slug, updatedAt })),
    );
  }
  return products;
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
