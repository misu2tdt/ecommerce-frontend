import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { Payment } from "@/types/payment";
import { PaymentStatusBadge } from "./payment-status";

export function PaymentHistory({ payments }: { payments: Payment[] }) {
  return (
    <section
      aria-labelledby="payment-history-heading"
      className="rounded-md border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="payment-history-heading"
            className="text-title font-bold text-brand-strong"
          >
            Payment history
          </h2>
          <p className="mt-2 text-body-sm text-neutral-600">
            Provider confirmation received by the backend is authoritative.
          </p>
        </div>
        <span className="text-body-sm text-neutral-600">
          {payments.length} {payments.length === 1 ? "attempt" : "attempts"}
        </span>
      </div>

      {payments.length === 0 ? (
        <p className="mt-5 rounded-md bg-surface-muted px-4 py-3 text-body-sm text-neutral-600">
          No Payment attempts have been created for this Order.
        </p>
      ) : (
        <ol className="mt-5 space-y-3">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="rounded-md border border-line p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-brand-strong">
                    Payment #{payment.id}
                  </p>
                  <p className="mt-1 text-body-sm capitalize text-neutral-600">
                    Provider: {payment.provider}
                  </p>
                </div>
                <PaymentStatusBadge status={payment.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-600">Amount</dt>
                  <dd className="mt-1 font-semibold text-brand">
                    {formatVnd(payment.amount)} {payment.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Created</dt>
                  <dd className="mt-1 font-semibold text-brand">
                    {formatDateTime(payment.createdAt)}
                  </dd>
                </div>
                {payment.succeededAt && (
                  <div className="sm:col-span-2">
                    <dt className="text-neutral-600">
                      Backend-confirmed success
                    </dt>
                    <dd className="mt-1 font-semibold text-brand">
                      {formatDateTime(payment.succeededAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
