import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddressForm } from "@/components/address-form";
import { CheckoutForm } from "@/components/checkout-form";
import { CheckoutSummary } from "@/components/checkout-summary";
import { FeedbackState } from "@/components/feedback-state";
import { getAddresses } from "@/features/addresses/api";
import { buildLoginHref } from "@/features/auth/redirects";
import { getCart } from "@/features/cart/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import type { Address } from "@/types/address";
import type { Cart } from "@/types/cart";

import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = {
  title: "Checkout",
  description: "Choose a saved shipping address and place your Order.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ coupon?: string }>;
}) {
  const [result, resolvedParams] = await Promise.all([
    loadCheckout(),
    searchParams ?? Promise.resolve<{ coupon?: string }>({}),
  ]);
  const initialCoupon =
    typeof resolvedParams?.coupon === "string" ? resolvedParams.coupon : "";

  if ("unauthenticated" in result) redirect(buildLoginHref("/checkout"));
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16">
        <FeedbackState
          title="Checkout unavailable"
          description={apiErrorMessage(result.error)}
          actionHref="/checkout"
          actionLabel="Try again"
        />
      </section>
    );
  }

  const { cart, addresses } = result;
  if (cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <Eyebrow>
            Checkout
          </Eyebrow>
          <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
            Your cart is empty
          </h1>
        </div>
        <FeedbackState
          title="Add something before checkout"
          description="Add a product to your cart, then come back to check out."
          actionHref="/products"
          actionLabel="Browse products"
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <Eyebrow>
        Secure checkout
      </Eyebrow>
      <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
        Shipping and order review
      </h1>
      <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
        Items in your cart are not reserved. Prices and stock are checked again
        when you place your order.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="rounded-md border border-line bg-surface p-5 sm:p-7">
          {addresses.length > 0 ? (
            <CheckoutForm
              addresses={addresses}
              cartSubtotal={cart.totalPrice}
              initialCouponCode={initialCoupon}
            />
          ) : (
            <div>
              <h2 className="text-title font-bold text-brand-strong">
                Add a shipping address
              </h2>
              <p className="mt-2 text-body text-neutral-600">
                Checkout requires an owned saved address. Save one here and it
                will become available without losing this checkout.
              </p>
              <div className="mt-6">
                <AddressForm mode="create" returnPath="/checkout" />
              </div>
              <Link
                href="/account/addresses?returnTo=%2Fcheckout"
                className="mt-5 inline-block text-body-sm font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand"
              >
                Open full address management
              </Link>
            </div>
          )}
        </div>
        <CheckoutSummary cart={cart} />
      </div>
    </section>
  );
}

async function loadCheckout(): Promise<
  | { cart: Cart; addresses: Address[] }
  | { unauthenticated: true }
  | { error: unknown }
> {
  try {
    const [cart, addresses] = await Promise.all([getCart(), getAddresses()]);
    return { cart, addresses };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    return { error };
  }
}
