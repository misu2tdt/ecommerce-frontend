import { expect, test } from "@playwright/test";
import {
  adminStatusLabel,
  checkoutOutcome,
  customerStatusLabel,
} from "@/lib/order-status";
import { formatVnd } from "@/lib/money";
import type { OrderStatus } from "@/types/order";

test.describe("order status labels", () => {
  test("customers read 'Awaiting payment' for a pending order", () => {
    expect(customerStatusLabel("pending")).toBe("Awaiting payment");
  });

  test("the other statuses read as plain words for customers", () => {
    expect(customerStatusLabel("confirmed")).toBe("Confirmed");
    expect(customerStatusLabel("processing")).toBe("Processing");
    expect(customerStatusLabel("shipped")).toBe("Shipped");
    expect(customerStatusLabel("delivered")).toBe("Delivered");
    expect(customerStatusLabel("cancelled")).toBe("Cancelled");
  });

  test("admins keep the raw backend status", () => {
    const statuses: OrderStatus[] = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    expect(statuses.map(adminStatusLabel)).toEqual([
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ]);
  });
});

test.describe("checkoutOutcome", () => {
  const now = new Date("2026-11-02T19:00:00Z");
  const deadline = "2026-11-02T19:30:00.000Z";

  test("a pending order before its deadline still needs payment", () => {
    expect(
      checkoutOutcome({ status: "pending", paymentExpiresAt: deadline }, now),
    ).toBe("awaiting-payment");
  });

  test("a pending order with no deadline from the backend still needs payment", () => {
    expect(
      checkoutOutcome({ status: "pending", paymentExpiresAt: null }, now),
    ).toBe("awaiting-payment");
  });

  test("a pending order past its deadline is treated as closed", () => {
    expect(
      checkoutOutcome(
        { status: "pending", paymentExpiresAt: "2026-11-02T18:59:59.000Z" },
        now,
      ),
    ).toBe("closed");
  });

  test("a cancelled order is closed", () => {
    expect(
      checkoutOutcome({ status: "cancelled", paymentExpiresAt: null }, now),
    ).toBe("closed");
  });

  test.describe("every status that follows a successful payment", () => {
    for (const status of [
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ] as const) {
      test(`${status} is paid`, () => {
        expect(checkoutOutcome({ status, paymentExpiresAt: null }, now)).toBe(
          "paid",
        );
      });
    }
  });
});

test.describe("money", () => {
  test("shows the symbol only, never the currency code next to it", () => {
    const text = formatVnd(249000);

    expect(text).toMatch(/^249\.000\s₫$/);
    expect(text).not.toContain("VND");
  });
});
