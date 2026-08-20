"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { cancelOrder } from "./api";

export interface CancelOrderState {
  status?: "success" | "error";
  message?: string;
}

export async function cancelOrderAction(
  _previousState: CancelOrderState,
  formData: FormData,
): Promise<CancelOrderState> {
  const orderId = readPositiveInteger(formData, "orderId");
  if (!orderId) {
    return { status: "error", message: "The Order identifier is invalid." };
  }

  let failure: unknown;
  try {
    await cancelOrder(orderId);
  } catch (error) {
    failure = error;
  }

  if (failure instanceof ApiError && failure.status === 401) {
    redirect(buildLoginHref(`/account/orders/${orderId}`));
  }
  if (failure) {
    return { status: "error", message: cancellationErrorMessage(failure) };
  }

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  return { status: "success", message: "Order cancelled successfully." };
}

function cancellationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Unable to cancel this Order. Please try again.";
  }
  if (error.status === 404) {
    return "Order not found or unavailable for this account.";
  }
  if (error.status === 409) {
    return error.message || "This paid Order cannot be cancelled before refund support is available.";
  }
  if (error.status === 400) return error.message;
  if (error.status === 0) {
    return "The Order service is unavailable. Please try again.";
  }
  return "Unable to cancel this Order. Please try again.";
}

function readPositiveInteger(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}
