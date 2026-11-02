"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { toShopperMessage } from "@/lib/shopper-messages";
import { completeDemoPayment } from "./api";
import {
  demoCompletionTarget,
  demoPayHref,
  parseDemoOutcome,
} from "./demo-pay";

export interface DemoPayState {
  // "error": try again on this page. "unavailable": the order can no longer
  // take this payment, so the buttons are replaced by a message.
  status?: "error" | "unavailable";
  message?: string;
}

const UNAVAILABLE_MESSAGE =
  "This order can no longer take this payment. It may have expired or already been updated. Nothing was charged.";

export async function completeDemoPaymentAction(
  _previousState: DemoPayState,
  formData: FormData,
): Promise<DemoPayState> {
  const paymentId = readPositiveInteger(formData, "paymentId");
  const orderHint = readPositiveInteger(formData, "orderId");
  // Only the outcome is read from the form besides the ids: an amount sent by
  // a browser would never be looked at.
  const outcome = parseDemoOutcome(readString(formData, "outcome"));
  if (!paymentId || !outcome) {
    return {
      status: "error",
      message: "We could not complete this payment. Please try again.",
    };
  }

  let completion;
  let failure: unknown;
  try {
    completion = await completeDemoPayment(paymentId, outcome);
  } catch (error) {
    failure = error;
  }

  if (failure instanceof ApiError && failure.status === 401) {
    redirect(
      buildLoginHref(
        orderHint
          ? demoPayHref(paymentId, orderHint)
          : `/demo-pay/${paymentId}`,
      ),
    );
  }
  if (failure || !completion) {
    return { status: "error", message: failureMessage(failure) };
  }

  const target = demoCompletionTarget(completion);
  if (target.kind === "order") {
    revalidatePath(`/account/orders/${completion.order.id}`);
    revalidatePath("/account/orders");
    redirect(target.href);
  }
  // Nothing changed, so nothing is revalidated: refreshing this page would
  // replace the message below with the generic "already complete" card.
  return { status: "unavailable", message: UNAVAILABLE_MESSAGE };
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return toShopperMessage(error.message);
    if (error.status === 0) {
      return "Payments are unavailable right now. Please try again.";
    }
  }
  return "We could not complete this payment. Please try again.";
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
