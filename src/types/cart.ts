import type { VndAmount } from "./catalog";

export interface CartProduct {
  id: number;
  name: string;
  slug: string;
  status: "active" | "inactive";
  primaryImage: string | null;
}

export interface CartVariant {
  id: number;
  sku: string;
  name: string;
  price: VndAmount;
  stock: number;
  attributes: Record<string, string>;
  isActive: boolean;
  product: CartProduct;
}

export interface CartItem {
  id: number;
  quantity: number;
  lineTotal: VndAmount;
  available: boolean;
  variant: CartVariant;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  totalPrice: VndAmount;
  createdAt: string;
  updatedAt: string;
}
