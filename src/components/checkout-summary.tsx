import Link from "next/link";
import { formatVnd } from "@/lib/money";
import type { Cart } from "@/types/cart";

export function CheckoutSummary({ cart }: { cart: Cart }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-950">Order summary</h2>
        <Link
          href="/cart"
          className="text-sm font-semibold text-emerald-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          Edit cart
        </Link>
      </div>
      <ul className="mt-5 divide-y divide-slate-200">
        {cart.items.map((item) => (
          <li key={item.id} className="py-4 first:pt-0">
            <div className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-950">
                  {item.variant.product.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.variant.name} · Qty {item.quantity}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SKU {item.variant.sku}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-slate-900">
                {formatVnd(item.lineTotal)}
              </p>
            </div>
            {!item.available && (
              <p className="mt-2 text-sm font-semibold text-amber-800">
                Availability changed; backend validation is required.
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-end justify-between border-t border-slate-200 pt-5">
        <span className="font-semibold text-slate-700">Total</span>
        <span className="text-2xl font-bold text-emerald-900">
          {formatVnd(cart.totalPrice)}
        </span>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Prices and inventory are recalculated by the backend when the Order is
        created. No shipping fee, tax, or coupon is added by this storefront.
      </p>
    </aside>
  );
}
