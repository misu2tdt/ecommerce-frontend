export type VndAmount = number;

export type ProductSort =
  | "featured"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "newest";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: number;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
  productId: number;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  price: VndAmount;
  compareAtPrice?: VndAmount | null;
  stock: number;
  attributes: Record<string, string>;
  position: number;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: "active";
  categoryId: number;
  category: Category;
  brandId: number | null;
  brand: Brand | null;
  images: ProductImage[];
  minPrice: VndAmount | null;
  maxPrice: VndAmount | null;
  minCompareAtPrice?: VndAmount | null;
  maxCompareAtPrice?: VndAmount | null;
  hasDiscount?: boolean;
  inStock: boolean;
  averageRating: number | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends ProductSummary {
  variants: ProductVariant[];
}

export interface CatalogFilterOptions {
  categories: Array<{ id: number; name: string; slug: string }>;
  brands: Array<{ id: number; name: string; slug: string }>;
  sizes: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
}
