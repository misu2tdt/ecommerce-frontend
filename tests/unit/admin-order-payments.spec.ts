import { expect, test } from "@playwright/test";
import {
  paymentStatusVariant,
  paymentsSectionState,
  showsReconciliationLink,
} from "@/lib/admin-order-payments";
import type { AdminOrderPayment } from "@/types/admin";

const payment: AdminOrderPayment = {
  id: 1,
  provider: "demo",
  amount: 129000,
  currency: "VND",
  status: "failed",
  createdAt: "2026-10-28T09:00:00.000Z",
  updatedAt: "2026-10-28T09:05:00.000Z",
  succeededAt: null,
};

test.describe("admin order payments section", () => {
  test("is hidden when the backend does not send the field", () => {
    expect(paymentsSectionState(undefined)).toBe("hidden");
  });

  test("says so when there is no payment attempt yet", () => {
    expect(paymentsSectionState([])).toBe("empty");
  });

  test("lists the payments when there are some", () => {
    expect(paymentsSectionState([payment])).toBe("list");
    expect(paymentsSectionState([payment, { ...payment, id: 2 }])).toBe("list");
  });

  test("links to the reconciliation queue only for an order with a payment", () => {
    expect(showsReconciliationLink(undefined)).toBe(false);
    expect(showsReconciliationLink([])).toBe(false);
    expect(showsReconciliationLink([payment])).toBe(true);
  });

  test("colours the status without relabelling it", () => {
    expect(paymentStatusVariant("succeeded")).toBe("success");
    expect(paymentStatusVariant("failed")).toBe("error");
    expect(paymentStatusVariant("pending")).toBe("warning");
    expect(paymentStatusVariant("processing")).toBe("warning");
    expect(paymentStatusVariant("cancelled")).toBe("neutral");
    expect(paymentStatusVariant("something-new")).toBe("neutral");
  });
});
