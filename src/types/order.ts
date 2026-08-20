import type { VndAmount } from "./catalog";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface ShippingAddressSnapshot {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  ward: string | null;
  district: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface CheckoutOrder {
  id: number;
  userId: number;
  totalPrice: VndAmount;
  status: OrderStatus;
  shippingAddress: ShippingAddressSnapshot;
  createdAt: string;
  updatedAt: string;
}
