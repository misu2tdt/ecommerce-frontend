import { apiFetch } from "@/lib/api";
import type {
  Brand,
  Category,
  ProductDetail,
  ProductSummary,
} from "@/types/catalog";

export interface ProductFilters {
  category?: string;
  brand?: string;
  q?: string;
}

export function getProducts(
  filters: ProductFilters = {},
): Promise<ProductSummary[]> {
  return apiFetch<ProductSummary[]>("/products", {
    query: {
      q: filters.q,
      category: filters.category,
      brand: filters.brand,
    },
  });
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
