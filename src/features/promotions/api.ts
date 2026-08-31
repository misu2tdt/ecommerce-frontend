import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type {
  Coupon,
  CreateCouponInput,
  UpdateCouponInput,
} from "@/types/promotions";

export function adminGetCoupons(): Promise<Coupon[]> {
  return authenticatedApiFetch<Coupon[]>("/admin/promotions");
}

export function adminGetCoupon(id: number): Promise<Coupon> {
  return authenticatedApiFetch<Coupon>(`/admin/promotions/${id}`);
}

export function adminCreateCoupon(data: CreateCouponInput): Promise<Coupon> {
  return authenticatedApiFetch<Coupon>("/admin/promotions", {
    method: "POST",
    body: data,
  });
}

export function adminUpdateCoupon(
  id: number,
  data: UpdateCouponInput,
): Promise<Coupon> {
  return authenticatedApiFetch<Coupon>(`/admin/promotions/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function adminToggleCouponActive(id: number): Promise<Coupon> {
  return authenticatedApiFetch<Coupon>(`/admin/promotions/${id}/toggle`, {
    method: "PATCH",
  });
}
