"use client";

import Link from "next/link";
import { useState } from "react";
import { CouponEntryBox } from "./coupon-entry-box";
import type { Cart } from "@/types/cart";
import type { CartQuoteResponse } from "@/types/promotions";

import { buttonStyles } from "@/components/ui/button";
export function CartSummary({ cart }: { cart: Cart }) {
  const [quote, setQuote] = useState<CartQuoteResponse | null>(null);

  const checkoutHref = quote?.coupon?.code
    ? `/checkout?coupon=${encodeURIComponent(quote.coupon.code)}`
    : "/checkout";

  return (
    <aside className="rounded-md border border-line bg-surface p-6 lg:sticky lg:top-6">
      <h2 className="text-title font-bold text-brand-strong">Cart summary</h2>
      <div className="mt-4 flex items-center justify-between border-b border-line pb-4 text-body-sm text-neutral-600">
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

      <p className="mt-4 text-body-sm text-neutral-600">
        Stock and coupon codes are checked again when you place your order.
      </p>

      <Link
        href={checkoutHref}
        className={buttonStyles({ variant: "primary", size: "lg", className: "mt-6 w-full" })}
      >
        Continue to checkout
      </Link>
      <Link
        href="/products"
        className={buttonStyles({ variant: "secondary", size: "md", className: "mt-3 w-full" })}
      >
        Continue shopping
      </Link>
    </aside>
  );
}
