import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoPaymentForm } from "@/components/demo-payment-form";
import { FeedbackState } from "@/components/feedback-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrders } from "@/features/orders/api";
import { getOrderPayments } from "@/features/payments/api";
import { demoPayHref, isOpenPayment } from "@/features/payments/demo-pay";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatVnd } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";
import type { Payment } from "@/types/payment";

export const metadata: Metadata = {
  title: "Demo payment",
  description: `A practice payment page for the ${SITE_NAME} demo store. No real money is charged.`,
};

type PageSearchParams = Record<string, string | string[] | undefined>;

export default async function DemoPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { paymentId: rawPaymentId } = await params;
  const query = await searchParams;
  const paymentId = readPositiveInteger(rawPaymentId);
  const orderHint = readPositiveInteger(first(query.order));

  const result = paymentId
    ? await loadOwnedPayment(paymentId, orderHint)
    : ({ notFound: true } as const);
  if ("unauthenticated" in result) {
    redirect(
      buildLoginHref(
        orderHint && paymentId
          ? demoPayHref(paymentId, orderHint)
          : `/demo-pay/${paymentId ?? ""}`,
      ),
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p
        role="note"
        className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-body font-semibold text-amber-900"
      >
        Demo payment. No real money is charged.
      </p>

      <Eyebrow className="mt-8 text-neutral-600">Payment</Eyebrow>
      <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-heading">
        Complete your payment
      </h1>

      <div className="mt-6">{renderBody(result)}</div>
    </section>
  );
}

function renderBody(result: Exclude<LoadedPayment, { unauthenticated: true }>) {
  if ("notFound" in result) {
    return (
      <FeedbackState
        title="Payment not found"
        description="We could not find this payment in your account."
        actionHref="/account/orders"
        actionLabel="View your orders"
      />
    );
  }
  if ("error" in result) {
    return (
      <FeedbackState
        title="Payment unavailable"
        description={apiErrorMessage(result.error)}
        actionHref="/account/orders"
        actionLabel="View your orders"
      />
    );
  }

  const { payment, orderId } = result.data;
  const orderHref = `/account/orders/${orderId}`;
  if (payment.provider !== "demo") {
    return (
      <FeedbackState
        title="This payment cannot be completed here"
        description="It was started with a different payment method."
        actionHref={orderHref}
        actionLabel="View order"
      />
    );
  }
  if (!isOpenPayment(payment.status)) {
    return (
      <FeedbackState
        title="This payment is already complete"
        description={
          payment.status === "succeeded"
            ? "This payment has already gone through."
            : "This payment was not completed and can no longer be used. You can start a new payment from your order."
        }
        actionHref={orderHref}
        actionLabel="View order"
      />
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-6 sm:p-8">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md bg-surface-muted p-4">
          <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
            Order
          </dt>
          <dd className="mt-2 font-bold text-brand-strong">#{orderId}</dd>
        </div>
        <div className="rounded-md bg-surface-muted p-4">
          <dt className="uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
            Amount
          </dt>
          <dd className="mt-2 font-bold text-brand-strong">
            {formatVnd(payment.amount)}
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-body text-neutral-600">
        This is a practice payment page for the demo store. Choose what should
        happen to this payment.
      </p>

      <DemoPaymentForm paymentId={payment.id} orderId={orderId} />
    </div>
  );
}

type LoadedPayment =
  | { data: { payment: Payment; orderId: number } }
  | { unauthenticated: true }
  | { notFound: true }
  | { error: unknown };

// The page never trusts the link: the payment must be in an order of the
// signed-in customer, and the amount shown is the one stored with the payment.
// The order in the link is only a shortcut; without it, the customer's newest
// orders are searched.
async function loadOwnedPayment(
  paymentId: number,
  orderHint: number | null,
): Promise<LoadedPayment> {
  try {
    if (orderHint) {
      const payment = await findInOrder(orderHint, paymentId);
      if (payment) return { data: { payment, orderId: orderHint } };
    }
    const orders = await getOrders();
    for (const order of orders.slice(0, 10)) {
      if (order.id === orderHint) continue;
      const payment = await findInOrder(order.id, paymentId);
      if (payment) return { data: { payment, orderId: order.id } };
    }
    return { notFound: true };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { unauthenticated: true };
    }
    return { error };
  }
}

// null when the order is not the customer's or does not hold the payment.
async function findInOrder(
  orderId: number,
  paymentId: number,
): Promise<Payment | null> {
  try {
    const payments = await getOrderPayments(orderId);
    return payments.find((payment) => payment.id === paymentId) ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readPositiveInteger(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
