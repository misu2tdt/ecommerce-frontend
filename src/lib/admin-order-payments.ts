import type { BadgeVariant } from "@/components/ui/badge";
import type { AdminOrderPayment } from "@/types/admin";

export type PaymentsSectionState = "hidden" | "empty" | "list";

// The payments of an order on the admin detail page. A backend that does not
// send the field (an older one) hides the section instead of breaking the page;
// an empty array is a real answer: no payment was ever started.
export function paymentsSectionState(
  payments: readonly AdminOrderPayment[] | undefined,
): PaymentsSectionState {
  if (payments === undefined) return "hidden";
  return payments.length === 0 ? "empty" : "list";
}

// The link to the reconciliation queue of an order only makes sense once the
// order has a payment (events belong to payments).
export function showsReconciliationLink(
  payments: readonly AdminOrderPayment[] | undefined,
): boolean {
  return payments !== undefined && payments.length > 0;
}

// Colour carries meaning only; the text is the backend's own status.
export function paymentStatusVariant(status: string): BadgeVariant {
  if (status === "succeeded") return "success";
  if (status === "failed") return "error";
  if (status === "pending" || status === "processing") return "warning";
  return "neutral";
}
