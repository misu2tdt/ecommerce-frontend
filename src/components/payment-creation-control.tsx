"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createPaymentAction,
  type CreatePaymentState,
} from "@/features/payments/actions";

import { buttonStyles } from "@/components/ui/button";
import { paymentLinkDecision } from "@/features/payments/checkout-link";

const INITIAL_STATE: CreatePaymentState = {};
const NOTICE_STYLES = {
  success: "border-success/30 bg-surface text-success",
  info: "border-line bg-surface text-brand-strong",
  error: "border-red-200 bg-red-50 text-red-800",
} as const;

export function PaymentCreationControl({
  orderId,
  idempotencyKey,
}: {
  orderId: number;
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState(
    createPaymentAction,
    INITIAL_STATE,
  );
  const attemptCreated = Boolean(state.payment);
  const decision = state.payment
    ? paymentLinkDecision(state.payment, state.checkoutUrl ?? state.payment.checkoutUrl)
    : null;

  return (
    <section className="rounded-md border border-line bg-surface-muted p-5">
      <h2 className="text-title font-bold text-brand-strong">Pay for this order</h2>
      <p className="mt-2 text-body text-brand-strong/80">
        You will continue to the payment page. Confirmation can arrive a little
        after you return to the store.
      </p>

      <form action={action} className="mt-5">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <button
          type="submit"
          disabled={pending || attemptCreated}
          className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}
        >
          {pending
            ? "Starting payment..."
            : attemptCreated
              ? "Payment started"
              : "Pay now"}
        </button>
      </form>

      {/* Once a payment exists, what is shown (and whether there is a pay
          button) is decided here from its status, not from what the server
          action put in `message` or `checkoutUrl`. */}
      {decision ? (
        <>
          <p
            role={decision.kind === "notice" && decision.tone === "error" ? "alert" : "status"}
            className={`mt-4 rounded-md border px-3 py-2 text-body-sm ${NOTICE_STYLES[decision.kind === "continue" ? "success" : decision.tone]}`}
          >
            {decision.message}
          </p>

          {decision.kind === "continue" && (
            <a
              href={decision.href}
              className={buttonStyles({ variant: "primary", size: "lg", className: "mt-4 w-full" })}
            >
              Continue to MoMo
            </a>
          )}

          {decision.kind === "notice" && (
            <Link
              href={`/account/orders/${orderId}`}
              prefetch={false}
              className={buttonStyles({ variant: "secondary", size: "md", className: "mt-4 w-full" })}
            >
              {decision.canRetry ? "Back to the order to try again" : "Check payment status"}
            </Link>
          )}
        </>
      ) : (
        state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`mt-4 rounded-md border px-3 py-2 text-body-sm ${NOTICE_STYLES[state.status === "error" ? "error" : "success"]}`}
          >
            {state.message}
          </p>
        )
      )}
    </section>
  );
}
