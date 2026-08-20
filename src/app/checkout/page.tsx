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

export const metadata: Metadata = {
  title: "Checkout",
  description: "Choose a saved shipping address and place your Order.",
};

export default async function CheckoutPage() {
  const result = await loadCheckout();
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Your cart is empty
          </h1>
        </div>
        <FeedbackState
          title="Add something before checkout"
          description="Checkout creates an Order from the current authenticated cart."
          actionHref="/products"
          actionLabel="Browse products"
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Secure checkout
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        Shipping and Order review
      </h1>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Cart items do not reserve inventory. The backend validates current
        product activity, price, and stock atomically when you place the Order.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {addresses.length > 0 ? (
            <CheckoutForm addresses={addresses} />
          ) : (
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Add a shipping address
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Checkout requires an owned saved address. Save one here and it
                will become available without losing this checkout.
              </p>
              <div className="mt-6">
                <AddressForm mode="create" returnPath="/checkout" />
              </div>
              <Link
                href="/account/addresses?returnTo=%2Fcheckout"
                className="mt-5 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-emerald-800"
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
