import { expect, test } from "@playwright/test";
import {
  demoCompletionTarget,
  demoPayHref,
  isOpenPayment,
  parseDemoOutcome,
} from "@/features/payments/demo-pay";
import { paymentProviderLabel } from "@/lib/payment-provider";
import type { DemoCompletion, Payment } from "@/types/payment";

const payment: Payment = {
  id: 42,
  provider: "demo",
  amount: 400000,
  currency: "VND",
  status: "succeeded",
  createdAt: "2026-08-15T08:00:00.000Z",
  updatedAt: "2026-08-15T08:00:05.000Z",
  succeededAt: "2026-08-15T08:00:05.000Z",
};

function completion(
  result: DemoCompletion["result"],
  orderId = 12,
): DemoCompletion {
  return {
    outcome: "success",
    result,
    payment,
    order: { id: orderId, status: "confirmed" },
  };
}

test.describe("where a finished demo payment sends the shopper", () => {
  test("an applied outcome goes to the order the backend reports", () => {
    expect(demoCompletionTarget(completion("applied", 12))).toEqual({
      kind: "order",
      href: "/account/orders/12",
    });
  });

  test("a repeated outcome goes to the same order page", () => {
    expect(demoCompletionTarget(completion("already_applied", 31))).toEqual({
      kind: "order",
      href: "/account/orders/31",
    });
  });

  test("an outcome the order could no longer take stays on a plain message", () => {
    expect(demoCompletionTarget(completion("recorded_for_review", 12))).toEqual({
      kind: "unavailable",
      orderId: 12,
    });
  });

  test("an unknown result is treated as unavailable, never as a success", () => {
    const odd = completion("applied");
    (odd as { result: string }).result = "something-new";

    expect(demoCompletionTarget(odd).kind).toBe("unavailable");
  });
});

test.describe("outcome parsing", () => {
  test("accepts exactly the three outcomes the backend knows", () => {
    expect(parseDemoOutcome("success")).toBe("success");
    expect(parseDemoOutcome("failure")).toBe("failure");
    expect(parseDemoOutcome("cancel")).toBe("cancel");
  });

  test("rejects everything else, including other casing and blanks", () => {
    for (const value of ["", "SUCCESS", "refund", "success ", "paid", null]) {
      expect(parseDemoOutcome(value as string | null)).toBeNull();
    }
  });
});

test.describe("demo payment page link", () => {
  test("carries the payment id and the order as a lookup hint", () => {
    expect(demoPayHref(42, 12)).toBe("/demo-pay/42?order=12");
  });
});

test.describe("which payments can still be finished", () => {
  test("only a payment that is waiting is open", () => {
    expect(isOpenPayment("pending")).toBe(true);
    expect(isOpenPayment("processing")).toBe(true);
    for (const status of ["succeeded", "failed", "cancelled"] as const) {
      expect(isOpenPayment(status)).toBe(false);
    }
  });
});

test.describe("payment provider names for shoppers", () => {
  test("names the provider without internal wording", () => {
    expect(paymentProviderLabel("momo")).toBe("MoMo");
    expect(paymentProviderLabel("demo")).toBe("Demo payment");
  });

  test("falls back to a readable name for anything else", () => {
    expect(paymentProviderLabel("zalopay")).toBe("Zalopay");
    expect(paymentProviderLabel("")).toBe("Unknown");
  });
});
