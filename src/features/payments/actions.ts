"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { toShopperMessage } from "@/lib/shopper-messages";
import type { Payment } from "@/types/payment";
import { createOrderPayment } from "./api";
import { paymentLinkDecision } from "./checkout-link";
import { demoPayHref } from "./demo-pay";
import { readIdField } from "@/lib/ids";

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
    return { status: "error", message: "We could not find that order." };
  }
  if (!isSafeIdempotencyKey(idempotencyKey)) {
    return {
      status: "error",
      message: "We could not start the payment. Please try again.",
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
    return {
      status: "error",
      message: "We could not start the payment. Please try again.",
    };
  }

  // The demo store has no checkout link: the shopper finishes on its own
  // practice payment page. MoMo payments carry on below, unchanged.
  if (payment.provider === "demo") {
    revalidatePath(`/account/orders/${orderId}`);
    redirect(demoPayHref(payment.id, orderId));
  }

  // Only a processing payment with a safe link gets one; see checkout-link.ts.
  const decision = paymentLinkDecision(payment);
  if (decision.kind === "continue") {
    return {
      status: "success",
      payment,
      checkoutUrl: decision.href,
      message: decision.message,
    };
  }
  return {
    status: decision.tone === "error" ? "error" : "success",
    payment,
    message: decision.message,
  };
}

function isSafeIdempotencyKey(value: string): boolean {
  return (
    value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)
  );
}

function readPositiveInteger(formData: FormData, key: string): number | null {
  return readIdField(formData, key);
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function paymentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "We could not start the payment. Please try again.";
  }
  if (error.status === 400) return toShopperMessage(error.message);
  if (error.status === 404) {
    return "We could not find this order in your account.";
  }
  if (error.status === 409) return toShopperMessage(error.message);
  if (error.status === 502) {
    return "The payment service is not available right now. Check your payment history below before trying again.";
  }
  if (error.status === 0) {
    return "Payments are unavailable right now. Please try again.";
  }
  return "We could not start the payment. Please try again.";
}
