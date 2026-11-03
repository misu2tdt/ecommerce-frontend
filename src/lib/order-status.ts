import type { OrderStatus } from "@/types/order";

// What the backend calls "pending" is an order that is saved but not paid yet.
// Customers read it as "Awaiting payment"; admins keep the backend's word.
const customerLabels: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const adminLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type StatusAudience = "customer" | "admin";

export function customerStatusLabel(status: OrderStatus): string {
  return customerLabels[status];
}

export function adminStatusLabel(status: OrderStatus): string {
  return adminLabels[status];
}

export function statusLabel(
  status: OrderStatus,
  audience: StatusAudience = "customer",
): string {
  return audience === "admin"
    ? adminStatusLabel(status)
    : customerStatusLabel(status);
}

export type CheckoutOutcome = "awaiting-payment" | "paid" | "closed";

// What the page shown right after placing an order should say. The deadline is
// the backend's `paymentExpiresAt`; a pending order past it is about to be
// cancelled by the backend, so it is no longer offered for payment.
export function checkoutOutcome(
  order: { status: OrderStatus; paymentExpiresAt: string | null },
  now: Date = new Date(),
): CheckoutOutcome {
  if (order.status === "cancelled") return "closed";
  if (order.status !== "pending") return "paid";
  if (
    order.paymentExpiresAt !== null &&
    new Date(order.paymentExpiresAt).getTime() <= now.getTime()
  ) {
    return "closed";
  }
  return "awaiting-payment";
}
