import { badgeStyles, type BadgeVariant } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/order";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Status colours carry meaning only: amber waiting, green done, red cancelled.
const statusVariants: Record<OrderStatus, BadgeVariant> = {
  pending: "warning",
  confirmed: "success",
  processing: "neutral",
  shipped: "neutral",
  delivered: "success",
  cancelled: "error",
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
      className={badgeStyles(statusVariants[status], undefined, "md")}
    >
      {statusLabels[status]}
    </span>
  );
}

export function OrderStatusProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4">
        <OrderStatusBadge status="cancelled" />
        <p className="mt-2 text-body-sm text-red-800">
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
            className={badgeStyles(
              current ? statusVariants[step] : "neutral",
              undefined,
              "md",
            )}
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
