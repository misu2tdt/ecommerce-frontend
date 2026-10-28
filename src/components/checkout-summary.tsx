import Link from "next/link";
import { formatVnd } from "@/lib/money";
import type { Cart } from "@/types/cart";

import { Eyebrow } from "@/components/ui/eyebrow";
export function CheckoutSummary({ cart }: { cart: Cart }) {
  return (
    <aside className="rounded-md border border-line bg-surface p-6 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-title font-bold text-brand-strong">Order summary</h2>
        <Link
          href="/cart"
          className="text-body-sm font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand"
        >
          Edit cart
        </Link>
      </div>
      <ul className="mt-5 divide-y divide-line">
        {cart.items.map((item) => (
          <li key={item.id} className="py-4 first:pt-0">
            <div className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-brand-strong">
                  {item.variant.product.name}
                </p>
                <p className="mt-1 text-body-sm text-neutral-600">
                  {item.variant.name} · Qty {item.quantity}
                </p>
                <Eyebrow className="mt-1 text-neutral-600">
                  SKU {item.variant.sku}
                </Eyebrow>
              </div>
              <p className="shrink-0 font-semibold text-brand">
                {formatVnd(item.lineTotal)}
              </p>
            </div>
            {!item.available && (
              <p className="mt-2 text-body-sm font-semibold text-amber-800">
                Availability changed; backend validation is required.
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-end justify-between border-t border-line pt-5">
        <span className="font-semibold text-neutral-700">Total</span>
        <span className="text-heading font-bold text-brand-strong">
          {formatVnd(cart.totalPrice)}
        </span>
      </div>
      <p className="mt-4 text-body-sm text-neutral-600">
        Prices, promotions, and inventory are recalculated atomically by the
        backend when the Order is placed.
      </p>
    </aside>
  );
}
