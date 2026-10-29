import { expect, test } from "@playwright/test";
import { toShopperMessage } from "@/lib/shopper-messages";

// The backend words its errors for developers. Shoppers see these through the
// cart, checkout and payment screens, so they are translated for display.

test.describe("toShopperMessage", () => {
  test("stock problems name the item and drop the word 'variant'", () => {
    expect(toShopperMessage("Variant Black / M has insufficient stock")).toBe(
      "There is not enough stock for Black / M.",
    );
  });

  test("missing or inactive items read as no longer available", () => {
    expect(toShopperMessage("Variant ID 12 does not exist")).toBe(
      "One of these items is no longer available.",
    );
    expect(toShopperMessage("Variant does not exist")).toBe(
      "One of these items is no longer available.",
    );
    expect(toShopperMessage("Variant is inactive")).toBe(
      "This item is no longer available.",
    );
    expect(toShopperMessage("Variant Navy / L is inactive")).toBe(
      "Navy / L is no longer available.",
    );
    expect(toShopperMessage("Product Classic Crewneck Cotton Tee is inactive")).toBe(
      "Classic Crewneck Cotton Tee is no longer available.",
    );
    expect(toShopperMessage("Product is inactive")).toBe(
      "This item is no longer available.",
    );
  });

  test("empty cart and missing cart item", () => {
    expect(toShopperMessage("Cannot checkout an empty cart")).toBe(
      "Your cart is empty.",
    );
    expect(toShopperMessage("Cannot quote an empty cart")).toBe(
      "Your cart is empty.",
    );
    expect(toShopperMessage("Cart item not found")).toBe(
      "That item is no longer in your cart.",
    );
  });

  test("payment conflicts never mention idempotency or providers", () => {
    expect(toShopperMessage("Only a pending Order can be paid")).toBe(
      "Only an order that is waiting for payment can be paid.",
    );
    expect(toShopperMessage("Order is already paid")).toBe(
      "This order is already paid.",
    );
    for (const raw of [
      "Idempotency key is already in use",
      "Idempotency-Key must be 8-128 safe characters",
      "Payment provider identity mismatch",
    ]) {
      expect(toShopperMessage(raw)).toBe(
        "We could not start this payment. Please try again.",
      );
    }
  });

  test("a message that is already readable is left alone", () => {
    expect(toShopperMessage("Order total must be at least 1,000 VND")).toBe(
      "Order total must be at least 1,000 VND",
    );
    expect(toShopperMessage("Invalid email or password.")).toBe(
      "Invalid email or password.",
    );
  });

  test("no translated message contains a developer word", () => {
    const raws = [
      "Variant Black / M has insufficient stock",
      "Variant ID 3 does not exist",
      "Variant is inactive",
      "Idempotency key is already in use",
      "Payment provider identity mismatch",
    ];
    for (const raw of raws) {
      expect(toShopperMessage(raw)).not.toMatch(
        /variant|idempoten|provider|identity|\bID\b/i,
      );
    }
  });
});
