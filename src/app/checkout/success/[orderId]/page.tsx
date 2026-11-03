import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge } from "@/components/order-status";
import { PaymentCreationControl } from "@/components/payment-creation-control";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrder } from "@/features/orders/api";
import { getOrderPayments } from "@/features/payments/api";
import { demoPayHref } from "@/features/payments/demo-pay";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatPaymentDeadline } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import { checkoutOutcome } from "@/lib/order-status";
import type { CheckoutOrder } from "@/types/order";
import type { Payment } from "@/types/payment";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Order placed",
  description: `Your ${SITE_NAME} order was placed.`,
};
export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId: rawOrderId } = await params;
  const orderId = readPositiveInteger(rawOrderId);
  if (!orderId) {
    return <InvalidOrder />;
  }

  const result = await loadOrder(orderId);
  if ("unauthenticated" in result) {
    redirect(buildLoginHref(`/checkout/success/${orderId}`));
  }
  if ("error" in result) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <FeedbackState
          as="h1"
          title="Order confirmation unavailable"
          description={apiErrorMessage(result.error)}
          actionHref="/account"
          actionLabel="Go to account"
        />
      </section>
    );
  }

  const order = result.data;
  const outcome = checkoutOutcome(order);
  if (outcome === "awaiting-payment") {
    return <AwaitingPayment order={order} payments={await loadPayments(order.id)} />;
  }
  if (outcome === "closed") return <ClosedOrder order={order} />;
  return <ThankYou order={order} />;
}

// An unpaid order: the page says what to do next, and the way to do it is one
// click away. Nothing here looks like a finished purchase.
function AwaitingPayment({
  order,
  payments,
}: {
  order: CheckoutOrder;
  payments: Payment[];
}) {
  const succeeded = payments.some((payment) => payment.status === "succeeded");
  const active = payments.find(
    (payment) => payment.status === "pending" || payment.status === "processing",
  );
  const idempotencyKey =
    !succeeded && !active ? `order-${order.id}-attempt-${randomUUID()}` : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="rounded-md border border-line bg-surface p-6 sm:p-9">
        <Eyebrow>Order placed</Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          Complete your payment
        </h1>
        <p className="mt-3 text-neutral-600">
          Your order is saved. It must be paid
          {order.paymentExpiresAt ? (
            <>
              {" "}
              by <strong>{formatPaymentDeadline(order.paymentExpiresAt)}</strong>
            </>
          ) : null}
          , or it is cancelled and the items go back in stock.
        </p>

        <OrderFacts order={order} />

        <div className="mt-8 grid gap-4">
          {idempotencyKey ? (
            <PaymentCreationControl
              orderId={order.id}
              idempotencyKey={idempotencyKey}
            />
          ) : active ? (
            <ContinuePayment order={order} payment={active} />
          ) : null}
          <Link
            href={`/account/orders/${order.id}`}
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            View Order
          </Link>
        </div>
      </div>
    </section>
  );
}

// A payment was started but not finished: send the shopper back to it.
function ContinuePayment({
  order,
  payment,
}: {
  order: CheckoutOrder;
  payment: Payment;
}) {
  const isDemo = payment.provider === "demo";
  return (
    <section className="rounded-md border border-line bg-surface-muted p-5">
      <h2 className="text-title font-bold text-brand-strong">
        Your payment is waiting
      </h2>
      <p className="mt-2 text-body text-brand-strong/80">
        You started paying for this order. Pick up where you left off.
      </p>
      <Link
        href={
          isDemo ? demoPayHref(payment.id, order.id) : `/account/orders/${order.id}`
        }
        className={buttonStyles({
          variant: "primary",
          size: "lg",
          className: "mt-5 w-full",
        })}
      >
        {isDemo ? "Continue demo payment" : "Check payment status"}
      </Link>
    </section>
  );
}

function ThankYou({ order }: { order: CheckoutOrder }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="rounded-md border border-success/30 bg-surface p-6 sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-heading font-bold text-success" aria-hidden="true">
          ✓
        </div>
        <Eyebrow className="mt-6">Order placed</Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          Thank you for your order
        </h1>
        <p className="mt-3 text-neutral-600">
          Your order is saved in your account, so you can find it any time under
          Order history.
        </p>

        <OrderFacts order={order} />

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href={`/account/orders/${order.id}`}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            View Order
          </Link>
          <Link
            href="/account/orders"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            View all Orders
          </Link>
          <Link
            href="/products"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Continue shopping
          </Link>
          <Link
            href="/account"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Go to account
          </Link>
        </div>
      </div>
    </section>
  );
}

// Cancelled, or unpaid past its deadline: nothing to pay any more.
function ClosedOrder({ order }: { order: CheckoutOrder }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="rounded-md border border-line bg-surface p-6 sm:p-9">
        <Eyebrow>Order #{order.id}</Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          This order is no longer open
        </h1>
        <p className="mt-3 text-neutral-600">
          It was not paid in time, so it was cancelled and the items went back
          in stock. You can place a new order whenever you like.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/account/orders"
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            View order history
          </Link>
          <Link
            href="/products"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}

function OrderFacts({ order }: { order: CheckoutOrder }) {
  return (
    <dl className="mt-8 grid gap-4 sm:grid-cols-3">
      <div className="rounded-md bg-surface-muted p-4">
        <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
          Order
        </dt>
        <dd className="mt-2 font-bold text-brand-strong">#{order.id}</dd>
      </div>
      <div className="rounded-md bg-surface-muted p-4">
        <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
          Status
        </dt>
        <dd className="mt-2">
          <OrderStatusBadge status={order.status} />
        </dd>
      </div>
      <div className="rounded-md bg-surface-muted p-4">
        <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
          Total
        </dt>
        <dd className="mt-2 font-bold text-brand-strong">
          {formatVnd(order.totalPrice)}
        </dd>
      </div>
    </dl>
  );
}
function InvalidOrder() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <FeedbackState
        as="h1"
        title="Invalid Order"
        description="The Order identifier is invalid."
        actionHref="/account"
        actionLabel="Go to account"
      />
    </section>
  );
}

async function loadOrder(orderId: number): Promise<
  { data: CheckoutOrder } | { unauthenticated: true } | { error: unknown }
> {
  try {
    return { data: await getOrder(orderId) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    return { error };
  }
}

// The payments of this order, to know whether one was already started. If they
// cannot be read the shopper can still start a payment.
async function loadPayments(orderId: number): Promise<Payment[]> {
  try {
    return await getOrderPayments(orderId);
  } catch {
    return [];
  }
}

function readPositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
