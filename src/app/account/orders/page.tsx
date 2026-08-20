import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge } from "@/components/order-status";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrders } from "@/features/orders/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { CustomerOrder } from "@/types/order";

export const metadata: Metadata = {
  title: "Your Orders",
  description: "Review your Evergreen Store Order history.",
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
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Your account
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        Order history
      </h1>
      <p className="mt-3 text-slate-600">
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
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-950">
                      Order #{order.id}
                    </h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Placed {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatVnd(order.totalPrice)}
                </p>
              </div>

              <ul className="mt-5 space-y-2 border-t border-slate-200 pt-5 text-sm text-slate-700">
                {order.items.slice(0, 2).map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span>
                      {item.variant.product.name} · {item.variant.name}
                    </span>
                    <span className="shrink-0 font-semibold">
                      Qty {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              {order.items.length > 2 && (
                <p className="mt-2 text-sm text-slate-500">
                  +{order.items.length - 2} more line items
                </p>
              )}

              <Link
                href={`/account/orders/${order.id}`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
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
