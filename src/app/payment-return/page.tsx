import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge } from "@/components/order-status";
import { PaymentHistory } from "@/components/payment-history";
import { PaymentStatusBadge } from "@/components/payment-status";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrder } from "@/features/orders/api";
import {
  getOrderPayments,
  resolveMomoPaymentReturn,
} from "@/features/payments/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import type { CustomerOrder } from "@/types/order";
import type { Payment } from "@/types/payment";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
export const metadata: Metadata = {
  title: "Payment return",
  description:
    "Check your payment status after returning from MoMo.",
};

type ReturnSearchParams = Record<string, string | string[] | undefined>;

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<ReturnSearchParams>;
}) {
  const query = await searchParams;
  const providerPaymentId = readFirst(query.orderId)?.trim();
  if (!providerPaymentId || providerPaymentId.length > 255) {
    return (
      <ReturnShell>
        <FeedbackState
          title="Payment return could not be identified"
          description="We could not tell which payment you came back from. Check your order history for the latest status."
          actionHref="/account/orders"
          actionLabel="View Orders"
        />
      </ReturnShell>
    );
  }

  const returnPath = `/payment-return?${new URLSearchParams({ orderId: providerPaymentId })}`;
  const result = await loadReturn(providerPaymentId);
  if ("unauthenticated" in result) redirect(buildLoginHref(returnPath));
  if ("notFound" in result) {
    return (
      <ReturnShell>
        <FeedbackState
          title="Payment return unavailable"
          description="We could not find this payment in your account. Check your order history for the latest status."
          actionHref="/account/orders"
          actionLabel="View Orders"
        />
      </ReturnShell>
    );
  }
  if ("error" in result) {
    return (
      <ReturnShell>
        <FeedbackState
          title="Unable to check Payment"
          description={apiErrorMessage(result.error)}
          actionHref={returnPath}
          actionLabel="Recheck status"
        />
      </ReturnShell>
    );
  }

  const { order, payments } = result.data;
  const latest = payments[0];
  const succeeded = payments.some((payment) => payment.status === "succeeded");
  const active = payments.some(
    (payment) =>
      payment.status === "pending" || payment.status === "processing",
  );
  const heading = succeeded
    ? "Payment confirmed"
    : active
      ? "Waiting for MoMo to confirm"
      : latest?.status === "failed"
        ? "Payment was not completed"
        : latest?.status === "cancelled"
          ? "Payment attempt cancelled"
          : "Payment status unavailable";
  const description = succeeded
    ? "MoMo has confirmed your payment."
    : active
      ? "Coming back from MoMo does not confirm the payment yet. We are still waiting for MoMo to confirm it, so check again in a moment."
      : "We have not received a confirmed payment for this order.";

  return (
    <ReturnShell>
      <div className="rounded-md border border-line bg-surface p-6 sm:p-8">
        <Eyebrow>
          Returned from MoMo
        </Eyebrow>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-bold tracking-tight text-brand-strong text-display">
            {heading}
          </h1>
          {latest && <PaymentStatusBadge status={latest.status} />}
        </div>
        <p className="mt-3 max-w-2xl text-body text-neutral-600">{description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md bg-surface-muted p-4">
          <span className="font-bold text-brand-strong">Order #{order.id}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={returnPath}
            prefetch={false}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Recheck status
          </Link>
          <Link
            href={`/account/orders/${order.id}`}
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            View Order
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <PaymentHistory payments={payments} />
      </div>
    </ReturnShell>
  );
}

function ReturnShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      {children}
    </section>
  );
}

async function loadReturn(
  providerPaymentId: string,
): Promise<
  | { data: { order: CustomerOrder; payments: Payment[] } }
  | { unauthenticated: true }
  | { notFound: true }
  | { error: unknown }
> {
  try {
    const { orderId } = await resolveMomoPaymentReturn(providerPaymentId);
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

function readFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
