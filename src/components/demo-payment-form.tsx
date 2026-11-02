"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  completeDemoPaymentAction,
  type DemoPayState,
} from "@/features/payments/demo-actions";
import { buttonStyles } from "@/components/ui/button";

const INITIAL_STATE: DemoPayState = {};

// Three outcomes, one form. The buttons are disabled while a request is on its
// way, and the backend treats a repeated outcome as the same one, so a double
// click cannot pay twice. Only the outcome is sent, never an amount.
export function DemoPaymentForm({
  paymentId,
  orderId,
}: {
  paymentId: number;
  orderId: number;
}) {
  const [state, action, pending] = useActionState(
    completeDemoPaymentAction,
    INITIAL_STATE,
  );

  if (state.status === "unavailable") {
    return (
      <div
        role="status"
        className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-body text-amber-900"
      >
        <p>{state.message}</p>
        <Link
          href="/account/orders"
          className={buttonStyles({
            variant: "secondary",
            size: "md",
            className: "mt-4",
          })}
        >
          View order history
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 grid gap-3">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        name="outcome"
        value="success"
        disabled={pending}
        className={buttonStyles({
          variant: "primary",
          size: "lg",
          className: "w-full",
        })}
      >
        Pay now
      </button>
      <button
        type="submit"
        name="outcome"
        value="failure"
        disabled={pending}
        className={buttonStyles({
          variant: "secondary",
          size: "lg",
          className: "w-full",
        })}
      >
        Simulate a failed payment
      </button>
      <button
        type="submit"
        name="outcome"
        value="cancel"
        disabled={pending}
        className={buttonStyles({
          variant: "secondary",
          size: "lg",
          className: "w-full",
        })}
      >
        Cancel payment
      </button>

      {pending && (
        <p role="status" className="text-body-sm text-neutral-600">
          Processing your payment...
        </p>
      )}
      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-800"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
