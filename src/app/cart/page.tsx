import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CartItemControls } from "@/components/cart-item-controls";
import { CartProductMedia } from "@/components/cart-product-media";
import { CartSummary } from "@/components/cart-summary";
import { ClearCartControl } from "@/components/clear-cart-control";
import { FeedbackState } from "@/components/feedback-state";
import { buildLoginHref } from "@/features/auth/redirects";
import { getCart } from "@/features/cart/api";
import { formatAttributeLabel } from "@/lib/attributes";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatVnd } from "@/lib/money";
import type { Cart } from "@/types/cart";

import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Cart",
  description: `Review and update your ${SITE_NAME} cart.`,
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
          <Eyebrow>
            Your cart
          </Eyebrow>
          <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
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
          <Eyebrow>
            Your cart
          </Eyebrow>
          <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
            Shopping cart
          </h1>
          <p className="mt-3 text-neutral-600">
            Review current prices and availability before checkout.
          </p>
        </div>
        <ClearCartControl />
      </div>

      <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
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
                className="rounded-md border border-line bg-surface p-5 sm:p-6"
              >
                <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <Link
                    href={`/products/${encodeURIComponent(product.slug)}`}
                    aria-label={`View ${product.name}`}
                    className="relative aspect-square overflow-hidden rounded-md border border-line bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
                          className="text-title font-bold text-brand-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 font-semibold text-neutral-700">
                          {item.variant.name}
                        </p>
                        <Eyebrow className="mt-1 text-neutral-600">
                          SKU {item.variant.sku}
                        </Eyebrow>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-body-sm text-neutral-600">Line total</p>
                        <p className="mt-1 text-title font-bold text-brand-strong">
                          {formatVnd(item.lineTotal)}
                        </p>
                      </div>
                    </div>

                    {attributes.length > 0 && (
                      <dl className="mt-4 flex flex-wrap gap-2">
                        {attributes.map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-md bg-brand-soft px-3 py-1.5 text-body-sm"
                          >
                            <dt className="inline font-semibold text-neutral-600">
                              {formatAttributeLabel(key)}:{" "}
                            </dt>
                            <dd className="inline text-neutral-800">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-neutral-600">
                      <p>Current price: {formatVnd(item.variant.price)}</p>
                      <p>Current stock: {item.variant.stock}</p>
                    </div>

                    {item.available ? (
                      <p className="mt-3 text-body-sm font-semibold text-success">
                        Available at the requested quantity
                      </p>
                    ) : (
                      <p
                        role="status"
                        className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm font-semibold text-amber-900"
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

        <CartSummary cart={cart} />
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
