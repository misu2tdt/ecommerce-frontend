import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { CancelOrderControl } from "@/components/cancel-order-control";
import { FeedbackState } from "@/components/feedback-state";
import { PaymentCreationControl } from "@/components/payment-creation-control";
import { PaymentHistory } from "@/components/payment-history";
import {
  isCustomerCancellable,
  OrderStatusBadge,
  OrderStatusProgress,
} from "@/components/order-status";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrder } from "@/features/orders/api";
import { getOrderPayments } from "@/features/payments/api";
import { formatAttributeLabel } from "@/lib/attributes";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { CustomerOrder } from "@/types/order";
import type { Payment } from "@/types/payment";

import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Order details",
  description: `Review an owned ${SITE_NAME} Order.`,
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId: rawOrderId } = await params;
  const orderId = readPositiveInteger(rawOrderId);
  if (!orderId) notFound();

  const result = await loadOrder(orderId);
  if ("unauthenticated" in result) {
    redirect(buildLoginHref(`/account/orders/${orderId}`));
  }
  if ("notFound" in result) notFound();
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-16">
        <FeedbackState
          title="Order unavailable"
          description={apiErrorMessage(result.error)}
          actionHref={`/account/orders/${orderId}`}
          actionLabel="Try again"
        />
      </section>
    );
  }

  const { order, payments } = result.data;
  const shipping = order.shippingAddress;
  const locality = [
    shipping.ward,
    shipping.district,
    shipping.city,
    shipping.stateProvince,
  ].filter(Boolean);
  const hasSucceededPayment = payments.some(
    (payment) => payment.status === "succeeded",
  );
  const hasActivePayment = payments.some(
    (payment) =>
      payment.status === "pending" || payment.status === "processing",
  );
  const canCreatePayment =
    order.status === "pending" && !hasSucceededPayment && !hasActivePayment;
  const idempotencyKey = canCreatePayment
    ? `order-${order.id}-attempt-${randomUUID()}`
    : null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <AccountNav />
      <Link
        href="/account/orders"
        className="mt-8 inline-block text-body-sm font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Back to all Orders
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-bold tracking-tight text-brand-strong text-display">
              Order #{order.id}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-3 text-neutral-600">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <p className="text-heading font-bold text-brand-strong">
          {formatVnd(order.totalPrice)}
        </p>
      </div>

      <section aria-labelledby="lifecycle-heading" className="mt-8">
        <h2
          id="lifecycle-heading"
          className="mb-4 text-title font-bold text-brand-strong"
        >
          Order status
        </h2>
        <OrderStatusProgress status={order.status} />
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <PaymentHistory payments={payments} />
        {idempotencyKey ? (
          <PaymentCreationControl
            orderId={order.id}
            idempotencyKey={idempotencyKey}
          />
        ) : hasSucceededPayment ? (
          <PaymentNotice
            tone="success"
            title="Payment confirmed"
            description="The backend received verified provider confirmation and updated this Order."
            orderId={order.id}
          />
        ) : hasActivePayment ? (
          <PaymentNotice
            tone="processing"
            title="Awaiting provider confirmation"
            description="A Payment is pending or processing. Returning from MoMo does not prove success; recheck until the backend receives a verified final IPN."
            orderId={order.id}
          />
        ) : (
          <PaymentNotice
            tone="neutral"
            title="Payment unavailable"
            description="This Order is not currently eligible for a new Payment attempt."
            orderId={order.id}
          />
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="text-heading font-bold text-brand-strong">
            Purchased items
          </h2>
          <div className="mt-4 space-y-4">
            {order.items.map((item) => {
              const attributes = Object.entries(item.variant.attributes);
              return (
                <article
                  key={item.id}
                  className="rounded-md border border-line bg-surface p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/products/${encodeURIComponent(item.variant.product.slug)}`}
                        className="text-title font-bold text-brand-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        {item.variant.product.name}
                      </Link>
                      <p className="mt-1 font-semibold text-neutral-700">
                        {item.variant.name}
                      </p>
                      <Eyebrow className="mt-1 text-neutral-600">
                        SKU {item.variant.sku}
                      </Eyebrow>
                    </div>
                    <p className="text-title font-bold text-brand-strong">
                      {formatVnd(item.lineTotal)}
                    </p>
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

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-body-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-neutral-600">Purchase-time price</dt>
                      <dd className="mt-1 font-semibold text-brand">
                        {formatVnd(item.price)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-600">Quantity</dt>
                      <dd className="mt-1 font-semibold text-brand">
                        {item.quantity}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-600">Line total</dt>
                      <dd className="mt-1 font-semibold text-brand">
                        {formatVnd(item.lineTotal)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="text-title font-bold text-brand-strong">
              Payment breakdown
            </h2>
            <div className="mt-4 space-y-2.5 text-body-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{formatVnd(order.subtotalPrice ?? order.totalPrice)}</span>
              </div>
              {order.discountPrice > 0 && (
                <div className="flex items-center justify-between font-semibold text-brand">
                  <span className="flex items-center gap-1.5">
                    <span>Promotion</span>
                    {order.couponCode && (
                      <span className="rounded-md bg-brand-soft px-1.5 py-0.5 font-mono text-body-sm font-bold text-brand">
                        {order.couponCode}
                      </span>
                    )}
                  </span>
                  <span>-{formatVnd(order.discountPrice)}</span>
                </div>
              )}
              <div className="flex items-end justify-between border-t border-line pt-3">
                <span className="font-bold text-brand-strong">Total</span>
                <span className="text-title font-bold text-brand-strong">
                  {formatVnd(order.totalPrice)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="text-title font-bold text-brand-strong">
              Shipping address used
            </h2>
            <p className="mt-2 text-body-sm text-neutral-600">
              Immutable snapshot captured when this Order was created—not your
              current saved address.
            </p>
            <div className="mt-4 text-body text-neutral-600">
              <p className="font-semibold text-brand-strong">
                {shipping.recipientName} · {shipping.phone}
              </p>
              <p>{shipping.addressLine1}</p>
              {shipping.addressLine2 && <p>{shipping.addressLine2}</p>}
              <p>{locality.join(", ")}</p>
              <p>
                {[shipping.postalCode, shipping.countryCode]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </section>

          {isCustomerCancellable(order.status) && (
            <CancelOrderControl orderId={order.id} />
          )}
        </aside>
      </div>
    </section>
  );
}

function PaymentNotice({
  tone,
  title,
  description,
  orderId,
}: {
  tone: "success" | "processing" | "neutral";
  title: string;
  description: string;
  orderId: number;
}) {
  const styles = {
    success: "border-success/30 bg-success-soft text-success",
    processing: "border-line bg-brand-soft text-brand-strong",
    neutral: "border-line bg-surface-muted text-brand",
  } as const;
  return (
    <aside className={`rounded-md border p-5 ${styles[tone]}`}>
      <h2 className="text-title font-bold">{title}</h2>
      <p className="mt-2 text-body opacity-80">{description}</p>
      <Link
        href={`/account/orders/${orderId}`}
        prefetch={false}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-current bg-surface px-4 py-2 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Recheck status
      </Link>
    </aside>
  );
}

async function loadOrder(
  orderId: number,
): Promise<
  | { data: { order: CustomerOrder; payments: Payment[] } }
  | { unauthenticated: true }
  | { notFound: true }
  | { error: unknown }
> {
  try {
    const [order, payments] = await Promise.all([
      getOrder(orderId),
      getOrderPayments(orderId),
    ]);
    return { data: { order, payments } };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    if (error instanceof ApiError && error.status === 404) {
      return { notFound: true };
    }
    return { error };
  }
}

function readPositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
