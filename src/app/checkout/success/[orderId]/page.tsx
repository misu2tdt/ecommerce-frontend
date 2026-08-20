import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrder } from "@/features/checkout/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatVnd } from "@/lib/money";
import type { CheckoutOrder } from "@/types/order";

export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your Evergreen Store Order was created successfully.",
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
      <section className="mx-auto max-w-3xl px-6 py-16">
        <FeedbackState
          title="Order confirmation unavailable"
          description={apiErrorMessage(result.error)}
          actionHref="/account"
          actionLabel="Go to account"
        />
      </section>
    );
  }

  const order = result.data;
  return (
    <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800" aria-hidden="true">
          ✓
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Order created
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Thank you for your order
        </h1>
        <p className="mt-3 text-slate-600">
          This confirmation was loaded from the authenticated backend Order,
          so it remains trustworthy after refresh.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Order
            </dt>
            <dd className="mt-2 font-bold text-slate-950">#{order.id}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </dt>
            <dd className="mt-2 font-bold capitalize text-slate-950">
              {order.status}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total
            </dt>
            <dd className="mt-2 font-bold text-emerald-900">
              {formatVnd(order.totalPrice)}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Continue shopping
          </Link>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-800 px-5 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Go to account
          </Link>
        </div>
      </div>
    </section>
  );
}

function InvalidOrder() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <FeedbackState
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

function readPositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
