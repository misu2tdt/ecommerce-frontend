import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge } from "@/components/order-status";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrders } from "@/features/orders/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { CustomerOrder } from "@/types/order";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Your Orders",
  description: `Review your ${SITE_NAME} Order history.`,
};

export default async function OrdersPage() {
  const result = await loadOrders();
  if ("unauthenticated" in result) {
    redirect(buildLoginHref("/account/orders"));
  }
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-16">
        <FeedbackState
          title="Orders unavailable"
          description={apiErrorMessage(result.error)}
          actionHref="/account/orders"
          actionLabel="Try again"
        />
      </section>
    );
  }

  const orders = result.data;
  return (
    <section className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <AccountNav />
      <Eyebrow className="mt-8">
        Your account
      </Eyebrow>
      <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
        Order history
      </h1>
      <p className="mt-3 text-neutral-600">
        Orders are shown newest first using the backend response order.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8">
          <FeedbackState
            title="No Orders yet"
            description="Completed checkouts will appear here."
            actionHref="/products"
            actionLabel="Browse products"
          />
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-md border border-line bg-surface p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-title font-bold text-brand-strong">
                      Order #{order.id}
                    </h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-body-sm text-neutral-600">
                    Placed {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <p className="text-heading font-bold text-brand-strong">
                  {formatVnd(order.totalPrice)}
                </p>
              </div>

              <ul className="mt-5 space-y-2 border-t border-line pt-5 text-body-sm text-neutral-700">
                {order.items.slice(0, 2).map((item) => (
                  <li key={item.id} className="flex min-w-0 justify-between gap-4">
                    <span className="min-w-0 break-words">
                      {item.variant.product.name} · {item.variant.name}
                    </span>
                    <span className="shrink-0 font-semibold">
                      Qty {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              {order.items.length > 2 && (
                <p className="mt-2 text-body-sm text-neutral-600">
                  +{order.items.length - 2} more line items
                </p>
              )}

              <Link
                href={`/account/orders/${order.id}`}
                className={buttonStyles({ variant: "secondary", size: "md", className: "mt-5" })}
              >
                View Order
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function loadOrders(): Promise<
  { data: CustomerOrder[] } | { unauthenticated: true } | { error: unknown }
> {
  try {
    return { data: await getOrders() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    return { error };
  }
}
