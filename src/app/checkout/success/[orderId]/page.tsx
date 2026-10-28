import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { buildLoginHref } from "@/features/auth/redirects";
import { getOrder } from "@/features/orders/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { formatVnd } from "@/lib/money";
import type { CheckoutOrder } from "@/types/order";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE_NAME } from "@/lib/site";
export const metadata: Metadata = {
  title: "Order confirmed",
  description: `Your ${SITE_NAME} Order was created successfully.`,
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
      <div className="rounded-md border border-success/30 bg-surface p-6 sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-heading font-bold text-success" aria-hidden="true">
          ✓
        </div>
        <Eyebrow className="mt-6">
          Order created
        </Eyebrow>
        <h1 className="mt-2 font-bold tracking-tight text-brand-strong text-display">
          Thank you for your order
        </h1>
        <p className="mt-3 text-neutral-600">
          This confirmation was loaded from the authenticated backend Order,
          so it remains trustworthy after refresh.
        </p>

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
            <dd className="mt-2 font-bold capitalize text-brand-strong">
              {order.status}
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
