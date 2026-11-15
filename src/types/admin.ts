import type {
  Brand,
  Category,
  ProductImage,
  ProductVariant,
  VndAmount,
} from "@/types/catalog";
import type { CustomerOrder } from "@/types/order";

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

// A payment attempt as the admin order detail lists it (newest first). The
// backend sends the same safe fields a customer gets, without a checkout link.
export interface AdminOrderPayment {
  id: number;
  provider: string;
  amount: VndAmount;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  succeededAt: string | null;
}

export interface AdminOrder extends CustomerOrder {
  // Only the order detail has it. Optional on the client for one reason: a
  // backend older than this field must not break the page (the section is
  // hidden). The order lists and a status change never carry it.
  payments?: AdminOrderPayment[];
}

export interface AdminReview {
  id: number;
  userId: number;
  rating: number;
  title: string | null;
  body: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  product: {
    id: number;
    name: string;
    slug: string;
  };
}
