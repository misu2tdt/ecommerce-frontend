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

export const metadata: Metadata = {
  title: "Payment return",
  description:
    "Check backend-confirmed Payment status after returning from MoMo.",
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
          description="No valid provider Payment identifier was supplied. Check your Order history for the authoritative status."
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
          description="This Payment could not be found for your account. Redirect result fields were not used as proof of payment."
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
      ? "Awaiting provider confirmation"
      : latest?.status === "failed"
        ? "Payment was not completed"
        : latest?.status === "cancelled"
          ? "Payment attempt cancelled"
          : "Payment status unavailable";
  const description = succeeded
    ? "The backend received and verified a final provider IPN."
    : active
      ? "Returning from MoMo is not proof of success. The backend is still waiting for a verified final IPN."
      : "The backend has not confirmed a successful Payment. The Order remains authoritative.";

  return (
    <ReturnShell>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Returned from MoMo
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            {heading}
          </h1>
          {latest && <PaymentStatusBadge status={latest.status} />}
        </div>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
          <span className="font-bold text-slate-950">Order #{order.id}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={returnPath}
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Recheck status
          </Link>
          <Link
            href={`/account/orders/${order.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
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
