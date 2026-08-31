"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  adminCreateCoupon,
  adminToggleCouponActive,
  adminUpdateCoupon,
} from "./api";
import type { CouponType, CreateCouponInput, UpdateCouponInput } from "@/types/promotions";

export interface AdminCouponActionState {
  status?: "success" | "error";
  message?: string;
}

export async function createCouponAction(
  _prevState: AdminCouponActionState,
  formData: FormData,
): Promise<AdminCouponActionState> {
  const code = formData.get("code")?.toString().trim().toUpperCase();
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString() as CouponType;
  const valueRaw = formData.get("value")?.toString();
  const minSubtotalRaw = formData.get("minSubtotal")?.toString();
  const maxDiscountRaw = formData.get("maxDiscount")?.toString();
  const startsAtRaw = formData.get("startsAt")?.toString();
  const endsAtRaw = formData.get("endsAt")?.toString();
  const isActive = formData.get("isActive") === "on";

  if (!code) {
    return { status: "error", message: "Coupon code is required." };
  }
  if (!name) {
    return { status: "error", message: "Coupon description name is required." };
  }
  if (!["PERCENTAGE", "FIXED"].includes(type)) {
    return { status: "error", message: "Choose a valid coupon discount type." };
  }

  const value = Number(valueRaw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { status: "error", message: "Value must be a positive integer." };
  }
  if (type === "PERCENTAGE" && value > 100) {
    return { status: "error", message: "Percentage discount cannot exceed 100%." };
  }

  const minSubtotal =
    minSubtotalRaw && minSubtotalRaw.trim().length > 0
      ? Number(minSubtotalRaw)
      : null;
  const maxDiscount =
    maxDiscountRaw && maxDiscountRaw.trim().length > 0 && type === "PERCENTAGE"
      ? Number(maxDiscountRaw)
      : null;

  const startsAt =
    startsAtRaw && startsAtRaw.trim().length > 0
      ? new Date(startsAtRaw).toISOString()
      : null;
  const endsAt =
    endsAtRaw && endsAtRaw.trim().length > 0
      ? new Date(endsAtRaw).toISOString()
      : null;

  const payload: CreateCouponInput = {
    code,
    name,
    type,
    value,
    minSubtotal: minSubtotal !== null && Number.isSafeInteger(minSubtotal) ? minSubtotal : null,
    maxDiscount: maxDiscount !== null && Number.isSafeInteger(maxDiscount) ? maxDiscount : null,
    startsAt,
    endsAt,
    isActive,
  };

  try {
    await adminCreateCoupon(payload);
    revalidatePath("/admin/promotions");
    return { status: "success", message: `Coupon "${code}" created successfully.` };
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Unable to create coupon. Please try again." };
  }
}

export async function updateCouponAction(
  _prevState: AdminCouponActionState,
  formData: FormData,
): Promise<AdminCouponActionState> {
  const idRaw = formData.get("id")?.toString();
  const id = Number(idRaw);
  if (!id || !Number.isSafeInteger(id)) {
    return { status: "error", message: "Invalid coupon ID." };
  }

  const code = formData.get("code")?.toString().trim().toUpperCase();
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString() as CouponType;
  const valueRaw = formData.get("value")?.toString();
  const minSubtotalRaw = formData.get("minSubtotal")?.toString();
  const maxDiscountRaw = formData.get("maxDiscount")?.toString();
  const startsAtRaw = formData.get("startsAt")?.toString();
  const endsAtRaw = formData.get("endsAt")?.toString();
  const isActive = formData.get("isActive") === "on";

  if (!code) {
    return { status: "error", message: "Coupon code is required." };
  }
  if (!name) {
    return { status: "error", message: "Coupon description name is required." };
  }
  if (!["PERCENTAGE", "FIXED"].includes(type)) {
    return { status: "error", message: "Choose a valid coupon discount type." };
  }

  const value = Number(valueRaw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { status: "error", message: "Value must be a positive integer." };
  }
  if (type === "PERCENTAGE" && value > 100) {
    return { status: "error", message: "Percentage discount cannot exceed 100%." };
  }

  const minSubtotal =
    minSubtotalRaw && minSubtotalRaw.trim().length > 0
      ? Number(minSubtotalRaw)
      : null;
  const maxDiscount =
    maxDiscountRaw && maxDiscountRaw.trim().length > 0 && type === "PERCENTAGE"
      ? Number(maxDiscountRaw)
      : null;

  const startsAt =
    startsAtRaw && startsAtRaw.trim().length > 0
      ? new Date(startsAtRaw).toISOString()
      : null;
  const endsAt =
    endsAtRaw && endsAtRaw.trim().length > 0
      ? new Date(endsAtRaw).toISOString()
      : null;

  const payload: UpdateCouponInput = {
    code,
    name,
    type,
    value,
    minSubtotal: minSubtotal !== null && Number.isSafeInteger(minSubtotal) ? minSubtotal : null,
    maxDiscount: maxDiscount !== null && Number.isSafeInteger(maxDiscount) ? maxDiscount : null,
    startsAt,
    endsAt,
    isActive,
  };

  try {
    await adminUpdateCoupon(id, payload);
    revalidatePath("/admin/promotions");
    return { status: "success", message: `Coupon "${code}" updated successfully.` };
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Unable to update coupon. Please try again." };
  }
}

export async function toggleCouponActiveAction(
  couponId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    await adminToggleCouponActive(couponId);
    revalidatePath("/admin/promotions");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to toggle coupon state." };
  }
}
