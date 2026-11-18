"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { getOrder } from "@/features/orders/api";
import { parseSimulation, parseSimulatorScenario } from "@/lib/payment-simulator";
import { toShopperMessage, toSimulatorMessage } from "@/lib/shopper-messages";
import type { DemoSimulation, Payment, PaymentSnapshot } from "@/types/payment";
import {
  createOrderPayment,
  getOrderPayments,
  simulateDemoPayment,
} from "./api";
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

// ---- "Try a tricky case" on the demo payment page ------------------------------

export interface SimulatorState {
  // "done": a case ran and `simulation` holds what the backend answered.
  // "error": nothing ran; `message` says why, in shopper words.
  status?: "done" | "error";
  message?: string;
  simulation?: DemoSimulation;
  // Counts the runs of this page, so a second run is a different result.
  stamp?: number;
}

// Runs one tricky case. Only the payment, the order hint and the scenario come
// from the form: the backend builds and signs every event itself.
export async function simulateDemoPaymentAction(
  previous: SimulatorState,
  formData: FormData,
): Promise<SimulatorState> {
  const stamp = (previous.stamp ?? 0) + 1;
  const paymentId = readPositiveInteger(formData, "paymentId");
  const orderHint = readPositiveInteger(formData, "orderId");
  const scenario = parseSimulatorScenario(readString(formData, "scenario"));
  if (!paymentId || !scenario) {
    return { status: "error", message: toSimulatorMessage(400, ""), stamp };
  }

  let answer: unknown;
  let failure: unknown;
  try {
    answer = await simulateDemoPayment(paymentId, scenario);
  } catch (error) {
    failure = error;
  }

  if (failure instanceof ApiError && failure.status === 401) {
    redirect(
      buildLoginHref(
        orderHint ? demoPayHref(paymentId, orderHint) : `/demo-pay/${paymentId}`,
      ),
    );
  }
  if (failure) {
    const status = failure instanceof ApiError ? failure.status : 0;
    const message = failure instanceof ApiError ? failure.message : "";
    return {
      status: "error",
      message: toSimulatorMessage(status, message),
      stamp,
    };
  }

  const simulation = parseSimulation(answer);
  if (!simulation) {
    return { status: "error", message: toSimulatorMessage(400, ""), stamp };
  }

  // Nothing is revalidated here, on purpose. A Server Action that revalidates
  // any path also refreshes the page the visitor is on, and a payment that this
  // case just finished would turn that page into the plain "already complete"
  // card and take the result panel with it. The order pages are not cached, so
  // they show the new status the next time they are opened.
  return { status: "done", simulation, stamp };
}

// The one look after a delayed event was due: the payment and the order as the
// backend has them now. Throws when it cannot tell (the page shows a calm note).
export async function checkDemoPaymentStatusAction(
  paymentId: number,
  orderId: number,
): Promise<PaymentSnapshot> {
  if (
    !Number.isSafeInteger(paymentId) ||
    paymentId < 1 ||
    !Number.isSafeInteger(orderId) ||
    orderId < 1
  ) {
    throw new Error("Invalid payment");
  }
  const [payments, order] = await Promise.all([
    getOrderPayments(orderId),
    getOrder(orderId),
  ]);
  const payment = payments.find((entry) => entry.id === paymentId);
  if (!payment) throw new Error("Payment not found");
  return { payment: payment.status, order: order.status };
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
