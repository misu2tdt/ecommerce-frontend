import type {
  Brand,
  Category,
  ProductImage,
  ProductVariant,
  VndAmount,
} from "@/types/catalog";

export type ProductStatus = "active" | "inactive";

export interface AdminProductVariant extends ProductVariant {
  productId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  categoryId: number;
  category: Category;
  brandId: number | null;
  brand: Brand | null;
  images: ProductImage[];
  variants: AdminProductVariant[];
  minPrice: VndAmount | null;
  maxPrice: VndAmount | null;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NamedCatalogInput {
  name: string;
  description?: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  categoryId: number;
  brandId?: number | null;
  status?: ProductStatus;
}

export interface VariantInput {
  sku?: string;
  name: string;
  price: number;
  stock: number;
  attributes?: Record<string, string>;
  isActive?: boolean;
  position?: number;
}

export interface ImageMetadataInput {
  altText?: string;
  position?: number;
  isPrimary?: boolean;
}
