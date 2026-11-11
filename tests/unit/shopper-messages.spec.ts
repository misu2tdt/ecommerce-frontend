import { expect, test } from "@playwright/test";
import { toCollectionAdminMessage, toShopperMessage } from "@/lib/shopper-messages";

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

  test("a missing payment reads as not found in the shopper's account", () => {
    expect(toShopperMessage("Payment not found")).toBe(
      "We could not find this payment in your account.",
    );
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

test.describe("toCollectionAdminMessage", () => {
  test("a duplicate address names the address and says what to do", () => {
    expect(
      toCollectionAdminMessage(
        "A collection with the slug 'summer-picks' already exists. Choose another name or slug.",
      ),
    ).toBe(
      'Another collection already uses the address "summer-picks". Choose a different name or address.',
    );
  });

  test("products that no longer exist are listed and the fix is explained", () => {
    expect(toCollectionAdminMessage("These product ids do not exist: 40, 41")).toBe(
      "Some of the chosen products no longer exist (ids 40, 41). Reload the page, pick the products again and save.",
    );
    expect(
      toCollectionAdminMessage(
        "One of the products no longer exists. Reload the product list and try again.",
      ),
    ).toMatch(/no longer exists/);
  });

  test("list problems and field problems read as instructions", () => {
    expect(
      toCollectionAdminMessage("productIds must not contain duplicates (repeated: 3)"),
    ).toBe("A product appears more than once in the list. Remove the repeat and save again.");
    expect(
      toCollectionAdminMessage("productIds must not hold more than 200 products"),
    ).toBe("A collection can hold at most 200 products.");
    expect(
      toCollectionAdminMessage(
        "slug may only contain lowercase letters and numbers joined by single dashes",
      ),
    ).toMatch(/for example summer-picks/);
    expect(toCollectionAdminMessage("name must be between 2 and 120 characters")).toBe(
      "Name must be between 2 and 120 characters.",
    );
    expect(
      toCollectionAdminMessage("heroImageUrl must be a valid http or https address"),
    ).toBe("The cover image must be a full http or https address.");
    expect(toCollectionAdminMessage("Collection not found")).toMatch(/no longer exists/);
  });

  test("several validation messages joined by the backend still map to the first rule", () => {
    expect(
      toCollectionAdminMessage(
        "name must be between 2 and 120 characters heroImageUrl must be a valid http or https address",
      ),
    ).toBe("Name must be between 2 and 120 characters.");
  });

  test("an unknown message is shown as the backend wrote it", () => {
    expect(toCollectionAdminMessage("Something else went wrong")).toBe(
      "Something else went wrong",
    );
  });

  test("no friendly message contains a developer word", () => {
    const raws = [
      "A collection with the slug 'x' already exists. Choose another name or slug.",
      "These product ids do not exist: 1",
      "productIds must not contain duplicates (repeated: 3)",
      "slug may only contain lowercase letters and numbers joined by single dashes",
      "heroImageUrl must be a valid http or https address",
    ];
    for (const raw of raws) {
      expect(toCollectionAdminMessage(raw)).not.toMatch(/productIds|heroImageUrl|\bslug\b|\bids\b.*do not exist/i);
    }
  });
});