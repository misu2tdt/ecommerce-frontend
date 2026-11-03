import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListPager } from "@/components/list-pager";
import { AccountNav } from "@/components/account-nav";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge } from "@/components/order-status";
import { buildLoginHref } from "@/features/auth/redirects";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import { getOrdersPage } from "@/features/orders/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import {
  pageRedirectTarget,
  parsePageParam,
  withPage,
  type PaginationInfo,
} from "@/lib/pagination";
import type { CustomerOrder } from "@/types/order";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Your Orders",
  description: `Review your ${SITE_NAME} Order history.`,
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const pageParam = parsePageParam((await searchParams).page);
  const result = await loadOrders(pageParam.page);
  if ("unauthenticated" in result) {
    redirect(buildLoginHref("/account/orders"));
  }
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <FeedbackState
          as="h1"
          title="Orders unavailable"
          description={apiErrorMessage(result.error)}
          actionHref="/account/orders"
          actionLabel="Try again"
        />
      </section>
    );
  }

  const { items: orders, ...pagination } = result.data;
  // An unusable page (not a number, or past the last page) goes to a real one.
  const redirectPage = pageRedirectTarget(pageParam, pagination.totalPages);
  if (redirectPage !== null) {
    redirect(withPage("/account/orders", "", redirectPage));
  }
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <AccountNav />
      <Eyebrow className="mt-8">
        Your account
      </Eyebrow>
      <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
        Order history
      </h1>
      <p className="mt-3 text-neutral-600">
        Your orders are listed newest first.
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
      <ListPager
        path="/account/orders"
        page={pageParam.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        label="Order history pages"
      />
    </section>
  );
}

async function loadOrders(page: number): Promise<
  | { data: { items: CustomerOrder[] } & PaginationInfo }
  | { unauthenticated: true }
  | { error: unknown }
> {
  try {
    return { data: await getOrdersPage(page) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    return { error };
  }
}
