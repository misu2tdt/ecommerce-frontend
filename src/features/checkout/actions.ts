"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { checkoutCart } from "./api";

export interface CheckoutActionState {
  status?: "error";
  message?: string;
  inventoryIssue?: boolean;
}

export async function checkoutAction(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const addressId = readPositiveInteger(formData, "addressId");
  if (!addressId) {
    return { status: "error", message: "Choose a valid shipping address." };
  }

  let orderId: number | null = null;
  let failure: unknown;
  try {
    const order = await checkoutCart(addressId);
    orderId = order.id;
  } catch (error) {
    failure = error;
  }

  if (failure instanceof ApiError && failure.status === 401) {
    redirect(buildLoginHref("/checkout"));
  }
  if (failure) {
    revalidatePath("/cart");
    revalidatePath("/checkout");
    return checkoutFailure(failure);
  }
  if (!orderId || !Number.isSafeInteger(orderId)) {
    return {
      status: "error",
      message: "The backend returned an invalid Order response.",
    };
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect(`/checkout/success/${orderId}`);
}

function checkoutFailure(error: unknown): CheckoutActionState {
  if (!(error instanceof ApiError)) {
    return { status: "error", message: "Unable to place the order. Please try again." };
  }

  const normalized = error.message.toLowerCase();
  const inventoryIssue =
    normalized.includes("insufficient stock") ||
    normalized.includes("inactive") ||
    normalized.includes("unavailable") ||
    normalized.includes("does not exist");

  if ([400, 404, 409].includes(error.status)) {
    return { status: "error", message: error.message, inventoryIssue };
  }
  if (error.status === 0) {
    return {
      status: "error",
      message: "The checkout service is unavailable. Your cart was not changed.",
    };
  }
  return {
    status: "error",
    message: "Unable to place the order. Your cart was not changed.",
  };
}

function readPositiveInteger(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}
