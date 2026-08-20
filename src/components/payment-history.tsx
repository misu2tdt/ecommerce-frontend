import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { Payment } from "@/types/payment";
import { PaymentStatusBadge } from "./payment-status";

export function PaymentHistory({ payments }: { payments: Payment[] }) {
  return (
    <section
      aria-labelledby="payment-history-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="payment-history-heading"
            className="text-xl font-bold text-slate-950"
          >
            Payment history
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Provider confirmation received by the backend is authoritative.
          </p>
        </div>
        <span className="text-sm text-slate-500">
          {payments.length} {payments.length === 1 ? "attempt" : "attempts"}
        </span>
      </div>

      {payments.length === 0 ? (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No Payment attempts have been created for this Order.
        </p>
      ) : (
        <ol className="mt-5 space-y-3">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">
                    Payment #{payment.id}
                  </p>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    Provider: {payment.provider}
                  </p>
                </div>
                <PaymentStatusBadge status={payment.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {formatVnd(payment.amount)} {payment.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {formatDateTime(payment.createdAt)}
                  </dd>
                </div>
                {payment.succeededAt && (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">
                      Backend-confirmed success
                    </dt>
                    <dd className="mt-1 font-semibold text-emerald-800">
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
