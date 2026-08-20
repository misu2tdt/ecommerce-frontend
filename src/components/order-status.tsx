import type { OrderStatus } from "@/types/order";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusClasses: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-blue-100 text-blue-900",
  processing: "bg-violet-100 text-violet-900",
  shipped: "bg-cyan-100 text-cyan-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-red-100 text-red-800",
};

const lifecycle: Exclude<OrderStatus, "cancelled">[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      aria-label={`Order status: ${statusLabels[status]}`}
      className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export function OrderStatusProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
        <OrderStatusBadge status="cancelled" />
        <p className="mt-2 text-sm text-red-800">
          This Order was cancelled. No later lifecycle state is implied.
        </p>
      </div>
    );
  }

  const currentIndex = lifecycle.indexOf(status);
  const reached = lifecycle.slice(0, currentIndex + 1);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Order lifecycle reached">
      {reached.map((step, index) => {
        const current = index === reached.length - 1;
        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              current
                ? statusClasses[step]
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {statusLabels[step]}
            <span className="sr-only"> {current ? "current" : "completed"}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function isCustomerCancellable(status: OrderStatus): boolean {
  return ["pending", "confirmed", "processing"].includes(status);
}
