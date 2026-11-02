import type {
  DemoCompletion,
  DemoOutcome,
  PaymentStatus,
} from "@/types/payment";

// Pure helpers for the demo payment page, kept apart from the server code so
// they can be unit tested.

const OUTCOMES: readonly DemoOutcome[] = ["success", "failure", "cancel"];

export function parseDemoOutcome(value: string | null): DemoOutcome | null {
  return OUTCOMES.find((outcome) => outcome === value) ?? null;
}

// The order is only a lookup hint: the page checks it with the backend before
// showing anything, and the amount is never put in the link.
export function demoPayHref(paymentId: number, orderId: number): string {
  return `/demo-pay/${paymentId}?order=${orderId}`;
}

// A payment that is still waiting for a result can be finished.
export function isOpenPayment(status: PaymentStatus): boolean {
  return status === "pending" || status === "processing";
}

export type DemoCompletionTarget =
  { kind: "order"; href: string } | { kind: "unavailable"; orderId: number };

// Where the shopper goes after the backend answered. Only a result the backend
// clearly reports as applied (now or earlier) leads to the order page; anything
// else, including a result this code does not know, stays on a plain message.
export function demoCompletionTarget(
  completion: DemoCompletion,
): DemoCompletionTarget {
  if (
    completion.result === "applied" ||
    completion.result === "already_applied"
  ) {
    return { kind: "order", href: `/account/orders/${completion.order.id}` };
  }
  return { kind: "unavailable", orderId: completion.order.id };
}
