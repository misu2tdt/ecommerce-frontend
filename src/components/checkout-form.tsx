"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AddressSummary } from "@/components/address-summary";
import {
  checkoutAction,
  type CheckoutActionState,
} from "@/features/checkout/actions";
import type { Address } from "@/types/address";

const INITIAL_STATE: CheckoutActionState = {};

export function CheckoutForm({ addresses }: { addresses: Address[] }) {
  const [state, formAction, pending] = useActionState(
    checkoutAction,
    INITIAL_STATE,
  );
  const initialAddress =
    addresses.find((address) => address.isDefault) ?? addresses[0];

  return (
    <form action={formAction}>
      <fieldset disabled={pending}>
        <legend className="text-xl font-bold text-slate-950">
          Shipping address
        </legend>
        <div className="mt-4 grid gap-3">
          {addresses.map((address) => (
            <label
              key={address.id}
              className="flex cursor-pointer gap-4 rounded-xl border border-slate-200 p-4 transition has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-800"
            >
              <input
                type="radio"
                name="addressId"
                value={address.id}
                defaultChecked={address.id === initialAddress.id}
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-800"
              />
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-950">
                    {address.label ?? "Saved address"}
                  </span>
                  {address.isDefault && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      Default
                    </span>
                  )}
                </span>
                <AddressSummary address={address} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 text-sm">
        <Link
          href="/account/addresses?returnTo=%2Fcheckout"
          className="font-semibold text-emerald-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Manage saved addresses
        </Link>
      </div>

      {state.message && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p>{state.message}</p>
          {state.inventoryIssue && (
            <Link
              href="/cart"
              className="mt-2 inline-block font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-red-700"
            >
              Review your cart
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 min-h-12 w-full rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}
