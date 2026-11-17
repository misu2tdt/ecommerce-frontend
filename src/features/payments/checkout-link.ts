import type { Payment } from "@/types/payment";

// What the page may offer after a payment was created. The pay button ("Continue
// to MoMo") is shown only for a payment that is `processing` AND has a checkout
// link that is safe to open. The backend does not give a link for any other
// status, but the page does not rely on that: a link that arrives with a
// cancelled, failed, succeeded or pending payment is ignored.

export type PaymentLinkDecision =
  | { kind: "continue"; href: string; message: string }
  | {
      kind: "notice";
      tone: "success" | "info" | "error";
      message: string;
      // True when the shopper can start a new attempt from the order page (it
      // offers one only if the order is still payable).
      canRetry: boolean;
    };

export function paymentLinkDecision(
  payment: Pick<Payment, "status"> & { checkoutUrl?: string },
  checkoutUrl: string | undefined = payment.checkoutUrl,
): PaymentLinkDecision {
  switch (payment.status) {
    case "processing": {
      const href = safeCheckoutUrl(checkoutUrl);
      if (href) {
        return {
          kind: "continue",
          href,
          message: "Payment started. Continue to MoMo to complete it.",
        };
      }
      return {
        kind: "notice",
        tone: checkoutUrl ? "error" : "info",
        message: checkoutUrl
          ? "We could not open the MoMo payment page. Check your payment status before trying again."
          : "We started your payment but could not open the MoMo page. Check your payment status before trying again.",
        canRetry: false,
      };
    }
    case "pending":
      return {
        kind: "notice",
        tone: "info",
        message:
          "Your payment is still being set up. Check your payment status in a moment.",
        canRetry: false,
      };
    case "succeeded":
      return {
        kind: "notice",
        tone: "success",
        message: "This payment is already confirmed.",
        canRetry: false,
      };
    case "failed":
      return {
        kind: "notice",
        tone: "error",
        message: "This payment did not go through.",
        canRetry: true,
      };
    case "cancelled":
      return {
        kind: "notice",
        tone: "info",
        message: "This payment was cancelled or has expired.",
        canRetry: true,
      };
    default:
      // A status this page does not know: never offer to pay.
      return {
        kind: "notice",
        tone: "info",
        message: "This payment cannot be continued. Check your payment status.",
        canRetry: false,
      };
  }
}

// A checkout link is opened only when it is an http(s) address.
export function safeCheckoutUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
