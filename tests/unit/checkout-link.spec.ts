import { expect, test } from "@playwright/test";
import {
  paymentLinkDecision,
  safeCheckoutUrl,
} from "@/features/payments/checkout-link";
import type { PaymentStatus } from "@/types/payment";

const LINK = "https://test-payment.momo.vn/pay/abc";

test.describe("when the pay button (Continue to MoMo) is offered", () => {
  test("a processing payment with a link gets the button", () => {
    expect(paymentLinkDecision({ status: "processing" }, LINK)).toEqual({
      kind: "continue",
      href: LINK,
      message: "Payment started. Continue to MoMo to complete it.",
    });
  });

  test("the link may also come on the payment itself", () => {
    const decision = paymentLinkDecision({
      status: "processing",
      checkoutUrl: LINK,
    });
    expect(decision.kind).toBe("continue");
  });

  test("a link on any other status is ignored, never a pay button", () => {
    const others: PaymentStatus[] = [
      "pending",
      "succeeded",
      "failed",
      "cancelled",
    ];
    for (const status of others) {
      expect(paymentLinkDecision({ status }, LINK).kind, status).toBe("notice");
    }
  });

  test("an unknown status never gets a button, even with a link", () => {
    const decision = paymentLinkDecision(
      { status: "expired" as PaymentStatus },
      LINK,
    );
    expect(decision.kind).toBe("notice");
  });

  test("a processing payment without a usable link gets no button", () => {
    for (const link of [undefined, "", "javascript:alert(1)", "not a url"]) {
      const decision = paymentLinkDecision({ status: "processing" }, link);
      expect(decision.kind, String(link)).toBe("notice");
      if (decision.kind === "notice") expect(decision.canRetry).toBe(false);
    }
  });

  test("an unusable link is an error, a missing one is only information", () => {
    const missing = paymentLinkDecision({ status: "processing" }, undefined);
    const broken = paymentLinkDecision({ status: "processing" }, "ftp://x");
    expect(missing).toMatchObject({ kind: "notice", tone: "info" });
    expect(broken).toMatchObject({ kind: "notice", tone: "error" });
  });
});

test.describe("what the shopper reads when there is no button", () => {
  test("a cancelled payment says so and allows a new attempt", () => {
    expect(paymentLinkDecision({ status: "cancelled" }, LINK)).toEqual({
      kind: "notice",
      tone: "info",
      message: "This payment was cancelled or has expired.",
      canRetry: true,
    });
  });

  test("a failed payment says so and allows a new attempt", () => {
    expect(paymentLinkDecision({ status: "failed" })).toEqual({
      kind: "notice",
      tone: "error",
      message: "This payment did not go through.",
      canRetry: true,
    });
  });

  test("a succeeded payment is confirmed and cannot be retried", () => {
    expect(paymentLinkDecision({ status: "succeeded" }, LINK)).toEqual({
      kind: "notice",
      tone: "success",
      message: "This payment is already confirmed.",
      canRetry: false,
    });
  });

  test("a pending payment is still being set up and cannot be retried", () => {
    const decision = paymentLinkDecision({ status: "pending" }, LINK);
    expect(decision).toMatchObject({ kind: "notice", canRetry: false });
  });
});

test.describe("which links may be opened", () => {
  test("only http and https", () => {
    expect(safeCheckoutUrl(LINK)).toBe(LINK);
    expect(safeCheckoutUrl("http://localhost:9/x")).toBe("http://localhost:9/x");
    for (const value of [undefined, "", "javascript:alert(1)", "data:text/html,x", "//x", "x"]) {
      expect(safeCheckoutUrl(value), String(value)).toBeNull();
    }
  });
});
