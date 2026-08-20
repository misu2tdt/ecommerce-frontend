"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createPaymentAction,
  type CreatePaymentState,
} from "@/features/payments/actions";

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
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <h2 className="text-xl font-bold text-emerald-950">Pay this Order</h2>
      <p className="mt-2 text-sm leading-6 text-emerald-900/80">
        The backend determines ownership, amount, currency, and eligibility.
        MoMo confirmation may arrive after you return to the store.
      </p>

      <form action={action} className="mt-5">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <button
          type="submit"
          disabled={pending || attemptCreated}
          className="min-h-12 w-full rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:bg-slate-300"
        >
          {pending
            ? "Creating Payment..."
            : attemptCreated
              ? "Payment attempt created"
              : "Pay now"}
        </button>
      </form>

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-white text-emerald-800"
          }`}
        >
          {state.message}
        </p>
      )}

      {state.checkoutUrl && (
        <a
          href={state.checkoutUrl}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-fuchsia-700 px-4 py-3 font-bold text-white hover:bg-fuchsia-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-700"
        >
          Continue to MoMo
        </a>
      )}

      {state.payment && !state.checkoutUrl && (
        <Link
          href={`/account/orders/${orderId}`}
          prefetch={false}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-800 bg-white px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Recheck Payment status
        </Link>
      )}
    </section>
  );
}
