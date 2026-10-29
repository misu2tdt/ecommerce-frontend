"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createPaymentAction,
  type CreatePaymentState,
} from "@/features/payments/actions";

import { buttonStyles } from "@/components/ui/button";
const INITIAL_STATE: CreatePaymentState = {};

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

  return (
    <section className="rounded-md border border-line bg-surface-muted p-5">
      <h2 className="text-title font-bold text-brand-strong">Pay for this order</h2>
      <p className="mt-2 text-body text-brand-strong/80">
        You will continue to MoMo to pay. Confirmation can arrive a little after
        you return to the store.
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

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-4 rounded-md border px-3 py-2 text-body-sm ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-success/30 bg-surface text-success"
          }`}
        >
          {state.message}
        </p>
      )}

      {state.checkoutUrl && (
        <a
          href={state.checkoutUrl}
          className={buttonStyles({ variant: "primary", size: "lg", className: "mt-4 w-full" })}
        >
          Continue to MoMo
        </a>
      )}

      {state.payment && !state.checkoutUrl && (
        <Link
          href={`/account/orders/${orderId}`}
          prefetch={false}
          className={buttonStyles({ variant: "secondary", size: "md", className: "mt-4 w-full" })}
        >
          Check payment status
        </Link>
      )}
    </section>
  );
}
