"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import type { Payment } from "@/types/payment";
import { createOrderPayment } from "./api";

export interface CreatePaymentState {
  status?: "success" | "error";
  message?: string;
  payment?: Payment;
  checkoutUrl?: string;
}

export async function createPaymentAction(
  _previousState: CreatePaymentState,
  formData: FormData,
): Promise<CreatePaymentState> {
  const orderId = readPositiveInteger(formData, "orderId");
  const idempotencyKey = readString(formData, "idempotencyKey").trim();
  if (!orderId) {
    return { status: "error", message: "The Order identifier is invalid." };
  }
  if (!isSafeIdempotencyKey(idempotencyKey)) {
    return {
      status: "error",
      message: "The payment attempt identifier is invalid.",
    };
  }

  let payment: Payment | undefined;
  let failure: unknown;
  try {
    payment = await createOrderPayment(orderId, idempotencyKey);
  } catch (error) {
    failure = error;
  }

  if (failure instanceof ApiError && failure.status === 401) {
    redirect(buildLoginHref(`/account/orders/${orderId}`));
  }
  if (failure) {
    if (failure instanceof ApiError && failure.status === 502) {
      revalidatePath(`/account/orders/${orderId}`);
    }
    return { status: "error", message: paymentErrorMessage(failure) };
  }
  if (!payment) {
    return { status: "error", message: "The backend returned no Payment." };
  }

  const checkoutUrl = safeCheckoutUrl(payment.checkoutUrl);
  if (payment.checkoutUrl && !checkoutUrl) {
    return {
      status: "error",
      message:
        "The provider checkout link was invalid. Recheck payment status before retrying.",
      payment,
    };
  }

  return {
    status: "success",
    payment,
    checkoutUrl: checkoutUrl ?? undefined,
    message: checkoutUrl
      ? "Payment attempt created. Continue to MoMo to complete checkout."
      : payment.status === "succeeded"
        ? "Payment is already confirmed by the backend."
        : "Payment attempt created, but no provider checkout link was returned. Recheck status before retrying.",
  };
}

function safeCheckoutUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isSafeIdempotencyKey(value: string): boolean {
  return (
    value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)
  );
}

function readPositiveInteger(formData: FormData, key: string): number | null {
  const raw = readString(formData, key);
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function paymentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Unable to create a Payment. Please try again.";
  }
  if (error.status === 400) return error.message;
  if (error.status === 404) {
    return "Order not found or unavailable for this account.";
  }
  if (error.status === 409) return error.message;
  if (error.status === 502) {
    return "MoMo checkout is currently unavailable. The Payment history below remains authoritative; recheck it before trying again.";
  }
  if (error.status === 0) {
    return "The Payment service is unavailable. Please try again.";
  }
  return "Unable to create a Payment. Please try again.";
}
