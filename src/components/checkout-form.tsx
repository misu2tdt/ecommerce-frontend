"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AddressSummary } from "@/components/address-summary";
import { CouponEntryBox } from "@/components/coupon-entry-box";
import {
  checkoutAction,
  type CheckoutActionState,
} from "@/features/checkout/actions";
import type { Address } from "@/types/address";

import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const INITIAL_STATE: CheckoutActionState = {};

interface CheckoutFormProps {
  addresses: Address[];
  cartSubtotal: number;
  initialCouponCode?: string;
}

export function CheckoutForm({
  addresses,
  cartSubtotal,
  initialCouponCode = "",
}: CheckoutFormProps) {
  const [state, formAction, pending] = useActionState(
    checkoutAction,
    INITIAL_STATE,
  );
  const initialAddress =
    addresses.find((address) => address.isDefault) ?? addresses[0];

  return (
    <form action={formAction}>
      <fieldset disabled={pending}>
        <legend className="text-title font-bold text-brand-strong">
          Shipping address
        </legend>
        <div className="mt-4 grid gap-3">
          {addresses.map((address) => (
            <label
              key={address.id}
              className="flex cursor-pointer gap-4 rounded-md border border-line p-4 transition has-[:checked]:border-brand has-[:checked]:bg-brand-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
            >
              <input
                type="radio"
                name="addressId"
                value={address.id}
                defaultChecked={address.id === initialAddress.id}
                className="mt-1 h-5 w-5 shrink-0 accent-brand"
              />
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-brand-strong">
                    {address.label ?? "Saved address"}
                  </span>
                  {address.isDefault && (
                    <Badge>Default</Badge>
                  )}
                </span>
                <AddressSummary address={address} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 text-body-sm">
        <Link
          href="/account/addresses?returnTo=%2Fcheckout"
          className="font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Manage saved addresses
        </Link>
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <CouponEntryBox
          initialSubtotal={cartSubtotal}
          appliedCode={initialCouponCode}
          showSummary={true}
        />
      </div>

      {state.message && (
        <div
          role="alert"
          className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800"
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
        className={buttonStyles({ variant: "primary", size: "lg", className: "mt-6 w-full" })}
      >
        {pending ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}
