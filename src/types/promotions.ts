import type { VndAmount } from "./catalog";

export type CouponType = "PERCENTAGE" | "FIXED";

export interface Coupon {
  id: number;
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minSubtotal: VndAmount | null;
  maxDiscount: VndAmount | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartQuoteResponse {
  subtotal: VndAmount;
  discount: VndAmount;
  total: VndAmount;
  coupon: Coupon | null;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minSubtotal?: VndAmount | null;
  maxDiscount?: VndAmount | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}

export interface UpdateCouponInput {
  code?: string;
  name?: string;
  type?: CouponType;
  value?: number;
  minSubtotal?: VndAmount | null;
  maxDiscount?: VndAmount | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}
