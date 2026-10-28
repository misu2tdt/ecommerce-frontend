"use client";

import { useActionState, useState } from "react";
import {
  cancelOrderAction,
  type CancelOrderState,
} from "@/features/orders/actions";

import { buttonStyles } from "@/components/ui/button";
const INITIAL_STATE: CancelOrderState = {};

export function CancelOrderControl({ orderId }: { orderId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    cancelOrderAction,
    INITIAL_STATE,
  );

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-11 rounded-md border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Cancel Order
        </button>
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`mt-3 text-body-sm ${
              state.status === "error" ? "text-red-700" : "text-success"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="cancel-order-heading"
      aria-describedby="cancel-order-description"
      className="rounded-md border border-red-200 bg-red-50 p-4"
    >
      <h2 id="cancel-order-heading" className="font-bold text-red-900">
        Cancel Order #{orderId}?
      </h2>
      <p id="cancel-order-description" className="mt-2 text-body-sm text-red-800">
        The backend will validate status and payment state, then restore stock
        transactionally if cancellation is allowed.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={formAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            disabled={pending}
            className={buttonStyles({ variant: "danger", size: "md" })}
          >
            {pending ? "Cancelling..." : "Yes, cancel Order"}
          </button>
        </form>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          Keep Order
        </button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="mt-3 text-body-sm text-red-800">
          {state.message}
        </p>
      )}
    </div>
  );
}
