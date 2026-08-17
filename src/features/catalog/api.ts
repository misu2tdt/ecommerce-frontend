import { apiFetch, type ApiQuery } from "@/lib/api";
import type { ProductDetail, ProductSummary } from "@/types/catalog";

export interface ProductFilters {
  category?: string;
  brand?: string;
  q?: string;
}

export function getProducts(
  filters: ProductFilters = {},
): Promise<ProductSummary[]> {
  return apiFetch<ProductSummary[]>("/products", {
    query: filters as ApiQuery,
  });
}

export function getProductBySlug(slug: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(
    `/products/slug/${encodeURIComponent(slug)}`,
  );
}
