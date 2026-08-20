import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type { Brand, Category, ProductImage } from "@/types/catalog";
import type {
  AdminProduct,
  AdminProductVariant,
  ImageMetadataInput,
  NamedCatalogInput,
  ProductInput,
  VariantInput,
} from "@/types/admin";

export const getAdminProducts = () =>
  authenticatedApiFetch<AdminProduct[]>("/products/admin");

export const getAdminProduct = (id: number) =>
  authenticatedApiFetch<AdminProduct>(`/products/admin/${id}`);

export const createCategory = (input: NamedCatalogInput) =>
  authenticatedApiFetch<Category>("/categories", { method: "POST", body: input });

export const updateCategory = (id: number, input: NamedCatalogInput) =>
  authenticatedApiFetch<Category>(`/categories/${id}`, { method: "PATCH", body: input });

export const deleteCategory = (id: number) =>
  authenticatedApiFetch<void>(`/categories/${id}`, { method: "DELETE" });

export const createBrand = (input: NamedCatalogInput) =>
  authenticatedApiFetch<Brand>("/brands", { method: "POST", body: input });

export const updateBrand = (id: number, input: NamedCatalogInput) =>
  authenticatedApiFetch<Brand>(`/brands/${id}`, { method: "PATCH", body: input });

export const deleteBrand = (id: number) =>
  authenticatedApiFetch<void>(`/brands/${id}`, { method: "DELETE" });

export const createProduct = (input: ProductInput) =>
  authenticatedApiFetch<AdminProduct>("/products", { method: "POST", body: input });

export const updateProduct = (id: number, input: ProductInput) =>
  authenticatedApiFetch<AdminProduct>(`/products/${id}`, { method: "PATCH", body: input });

export const deleteProduct = (id: number) =>
  authenticatedApiFetch<void>(`/products/${id}`, { method: "DELETE" });

export const createVariant = (productId: number, input: VariantInput) =>
  authenticatedApiFetch<AdminProductVariant>(`/products/${productId}/variants`, {
    method: "POST",
    body: input,
  });

export const updateVariant = (
  productId: number,
  variantId: number,
  input: VariantInput,
) =>
  authenticatedApiFetch<AdminProductVariant>(
    `/products/${productId}/variants/${variantId}`,
    { method: "PATCH", body: input },
  );

export const deleteVariant = (productId: number, variantId: number) =>
  authenticatedApiFetch<void>(`/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
  });

export const uploadProductImage = (productId: number, body: FormData) =>
  authenticatedApiFetch<ProductImage>(`/products/${productId}/images`, {
    method: "POST",
    body,
  });

export const updateProductImage = (
  productId: number,
  imageId: number,
  input: ImageMetadataInput,
) =>
  authenticatedApiFetch<ProductImage>(`/products/${productId}/images/${imageId}`, {
    method: "PATCH",
    body: input,
  });

export const deleteProductImage = (productId: number, imageId: number) =>
  authenticatedApiFetch<void>(`/products/${productId}/images/${imageId}`, {
    method: "DELETE",
  });
