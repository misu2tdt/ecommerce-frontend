import { badgeStyles, type BadgeVariant } from "@/components/ui/badge";
import { statusLabel, type StatusAudience } from "@/lib/order-status";
import type { OrderStatus } from "@/types/order";

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

// Customers see plain wording ("Awaiting payment"); admin pages pass
// audience="admin" to keep the backend's raw status.
export function OrderStatusBadge({
  status,
  audience = "customer",
}: {
  status: OrderStatus;
  audience?: StatusAudience;
}) {
  const label = statusLabel(status, audience);
  return (
    <span
      aria-label={`Order status: ${label}`}
      className={badgeStyles(statusVariants[status], undefined, "md")}
    >
      {label}
    </span>
  );
}

export function OrderStatusProgress({
  status,
  audience = "customer",
}: {
  status: OrderStatus;
  audience?: StatusAudience;
}) {
  if (status === "cancelled") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4">
        <OrderStatusBadge status="cancelled" audience={audience} />
        <p className="mt-2 text-body-sm text-red-800">
          This order was cancelled.
        </p>
      </div>
    );
  }

  const currentIndex = lifecycle.indexOf(status);
  const reached = lifecycle.slice(0, currentIndex + 1);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Order progress">
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
            {statusLabel(step, audience)}
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
