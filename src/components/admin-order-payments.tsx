import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  paymentStatusVariant,
  paymentsSectionState,
  showsReconciliationLink,
} from "@/lib/admin-order-payments";
import { formatDateTime } from "@/lib/dates";
import { formatEventAmount, orderReconciliationHref } from "@/lib/reconciliation";
import type { AdminOrderPayment } from "@/types/admin";

// The payment attempts of an order, newest first, exactly as the backend sends
// them. Hidden when the backend does not send the field at all.
export function AdminOrderPayments({
  orderId,
  payments,
}: {
  orderId: number;
  payments: AdminOrderPayment[] | undefined;
}) {
  const state = paymentsSectionState(payments);
  if (state === "hidden") return null;

  return (
    <section aria-labelledby="admin-order-payments-heading" className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3
          id="admin-order-payments-heading"
          className="text-heading font-bold text-brand-strong"
        >
          Payments
        </h3>
        {showsReconciliationLink(payments) && (
          <Link
            href={orderReconciliationHref(orderId)}
            className="inline-flex min-h-11 items-center font-semibold text-brand underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            View reconciliation items for this order
          </Link>
        )}
      </div>
      {state === "empty" ? (
        <p className="mt-4 rounded-md border border-line bg-surface p-5 text-body text-neutral-600">
          No payment attempts yet
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {payments!.map((payment) => (
            <li
              key={payment.id}
              className="rounded-md border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-title font-bold text-brand-strong">
                    Payment #{payment.id}
                  </p>
                  <Badge variant={paymentStatusVariant(payment.status)} size="md">
                    {payment.status}
                  </Badge>
                </div>
                <p className="text-title font-bold text-brand-strong">
                  {formatEventAmount(payment.amount, payment.currency)}
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-3">
                <div>
                  <dt className="text-neutral-600">Provider</dt>
                  <dd className="mt-1 font-semibold">{payment.provider}</dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Created</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDateTime(payment.createdAt)}
                  </dd>
                </div>
                {payment.succeededAt && (
                  <div>
                    <dt className="text-neutral-600">Succeeded</dt>
                    <dd className="mt-1 font-semibold">
                      {formatDateTime(payment.succeededAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
