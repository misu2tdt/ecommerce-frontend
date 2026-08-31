"use client";

import Link from "next/link";
import { useState } from "react";
import { CouponEntryBox } from "./coupon-entry-box";
import type { Cart } from "@/types/cart";
import type { CartQuoteResponse } from "@/types/promotions";

export function CartSummary({ cart }: { cart: Cart }) {
  const [quote, setQuote] = useState<CartQuoteResponse | null>(null);

  const checkoutHref = quote?.coupon?.code
    ? `/checkout?coupon=${encodeURIComponent(quote.coupon.code)}`
    : "/checkout";

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
      <h2 className="text-xl font-bold text-slate-950">Cart summary</h2>
      <div className="mt-4 flex items-center justify-between border-b border-slate-200 pb-4 text-sm text-slate-600">
        <span>
          {cart.items.length} {cart.items.length === 1 ? "item" : "items"}
        </span>
        <span>Eligible items</span>
      </div>

      <div className="mt-5">
        <CouponEntryBox
          initialSubtotal={cart.totalPrice}
          onQuoteChange={setQuote}
          showSummary={true}
        />
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Inventory and coupon eligibility are validated server-side when placing
        the order.
      </p>

      <Link
        href={checkoutHref}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Continue to checkout
      </Link>
      <Link
        href="/products"
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Continue shopping
      </Link>
    </aside>
  );
}
