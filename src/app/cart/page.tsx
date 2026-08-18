import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CartItemControls } from "@/components/cart-item-controls";
import { CartProductMedia } from "@/components/cart-product-media";
import { ClearCartControl } from "@/components/clear-cart-control";
import { FeedbackState } from "@/components/feedback-state";
import { buildLoginHref } from "@/features/auth/redirects";
import { getCart } from "@/features/cart/api";
import { formatAttributeLabel } from "@/lib/attributes";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatVnd } from "@/lib/money";
import type { Cart } from "@/types/cart";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review and update your Evergreen Store cart.",
};

export default async function CartPage() {
  const result = await loadCart();
  if ("unauthenticated" in result) redirect(buildLoginHref("/cart"));
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16">
        <FeedbackState
          title="Cart unavailable"
          description={apiErrorMessage(result.error)}
          actionHref="/cart"
          actionLabel="Try again"
        />
      </section>
    );
  }

  const cart = result.data;
  if (cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Your cart
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Shopping cart
          </h1>
        </div>
        <FeedbackState
          title="Your cart is empty"
          description="Browse the catalog and choose a product variant to get started."
          actionHref="/products"
          actionLabel="Browse products"
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Your cart
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Shopping cart
          </h1>
          <p className="mt-3 text-slate-600">
            Review current prices and availability before checkout.
          </p>
        </div>
        <ClearCartControl />
      </div>

      <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Cart contents do not reserve inventory. Availability is checked against
        current catalog data.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          {cart.items.map((item) => {
            const product = item.variant.product;
            const attributes = Object.entries(item.variant.attributes);

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <Link
                    href={`/products/${encodeURIComponent(product.slug)}`}
                    aria-label={`View ${product.name}`}
                    className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                  >
                    <CartProductMedia
                      imageUrl={product.primaryImage}
                      productName={product.name}
                    />
                  </Link>

                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Link
                          href={`/products/${encodeURIComponent(product.slug)}`}
                          className="text-lg font-bold text-slate-950 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-800"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 font-semibold text-slate-700">
                          {item.variant.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          SKU {item.variant.sku}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-sm text-slate-500">Line total</p>
                        <p className="mt-1 text-lg font-bold text-emerald-900">
                          {formatVnd(item.lineTotal)}
                        </p>
                      </div>
                    </div>

                    {attributes.length > 0 && (
                      <dl className="mt-4 flex flex-wrap gap-2">
                        {attributes.map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs"
                          >
                            <dt className="inline font-semibold text-slate-500">
                              {formatAttributeLabel(key)}:{" "}
                            </dt>
                            <dd className="inline text-slate-800">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                      <p>Current price: {formatVnd(item.variant.price)}</p>
                      <p>Current stock: {item.variant.stock}</p>
                    </div>

                    {item.available ? (
                      <p className="mt-3 text-sm font-semibold text-emerald-700">
                        Available at the requested quantity
                      </p>
                    ) : (
                      <p
                        role="status"
                        className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
                      >
                        This item is currently unavailable at quantity {item.quantity}.
                        It remains in your cart and will be validated at checkout.
                      </p>
                    )}
                  </div>
                </div>

                <CartItemControls itemId={item.id} quantity={item.quantity} />
              </article>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-xl font-bold text-slate-950">Cart summary</h2>
          <div className="mt-5 flex items-center justify-between border-b border-slate-200 pb-5 text-sm text-slate-600">
            <span>{cart.items.length} {cart.items.length === 1 ? "item" : "items"}</span>
            <span>Current total</span>
          </div>
          <p className="mt-5 text-3xl font-bold tracking-tight text-emerald-900">
            {formatVnd(cart.totalPrice)}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Checkout and address selection will be added in Phase 4F.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </section>
  );
}

async function loadCart(): Promise<
  { data: Cart } | { unauthenticated: true } | { error: unknown }
> {
  try {
    return { data: await getCart() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    return { error };
  }
}
