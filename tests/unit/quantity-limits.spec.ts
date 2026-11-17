import { expect, test } from "@playwright/test";
import { toShopperMessage } from "@/lib/shopper-messages";
import {
  canAddNewLine,
  canIncreaseQuantity,
  LINE_LIMIT_MESSAGE,
  QUANTITY_LIMIT_MESSAGE,
  quantityCap,
} from "@/lib/quantity-limits";

test.describe("the most that can be chosen for a variant", () => {
  test("is the stock when the stock is 99 or less", () => {
    expect(quantityCap(45)).toEqual({ max: 45, limitedBy: "stock" });
    expect(quantityCap(99)).toEqual({ max: 99, limitedBy: "stock" });
    expect(quantityCap(1)).toEqual({ max: 1, limitedBy: "stock" });
  });

  test("is 99 when there is more in stock", () => {
    expect(quantityCap(100)).toEqual({ max: 99, limitedBy: "line" });
    expect(quantityCap(1_000_000)).toEqual({ max: 99, limitedBy: "line" });
  });

  test("is 0 when there is none, or the stock is not a usable number", () => {
    for (const stock of [0, -3, NaN, Infinity]) {
      expect(quantityCap(stock).max, String(stock)).toBe(0);
    }
  });
});

test.describe("the + button of a cart line", () => {
  test("allows an increase below the cap", () => {
    expect(canIncreaseQuantity(1, 50)).toEqual({ allowed: true });
    expect(canIncreaseQuantity(98, 500)).toEqual({ allowed: true });
  });

  test("is refused at 99 with the line limit as the reason", () => {
    expect(canIncreaseQuantity(99, 500)).toEqual({
      allowed: false,
      reason: QUANTITY_LIMIT_MESSAGE,
    });
    expect(canIncreaseQuantity(99, 500).allowed).toBe(false);
    expect(QUANTITY_LIMIT_MESSAGE).toBe(
      "You can buy up to 99 of one item at a time.",
    );
  });

  test("is refused at the stock, with the stock as the reason", () => {
    expect(canIncreaseQuantity(45, 45)).toEqual({
      allowed: false,
      reason: "That is all we have in stock.",
    });
  });

  test("is refused when the quantity is already above the cap", () => {
    expect(canIncreaseQuantity(5, 3).allowed).toBe(false);
    expect(canIncreaseQuantity(120, 500).allowed).toBe(false);
  });
});

test.describe("the 50-line cart", () => {
  test("a new product fits up to 49 lines and not at 50", () => {
    expect(canAddNewLine(0)).toBe(true);
    expect(canAddNewLine(49)).toBe(true);
    expect(canAddNewLine(50)).toBe(false);
    expect(canAddNewLine(60)).toBe(false);
  });

  test("the message for a full cart is the one the backend's message maps to", () => {
    expect(LINE_LIMIT_MESSAGE).toBe(
      "Your cart can hold at most 50 different products. Remove one to add another.",
    );
    expect(toShopperMessage("A cart holds at most 50 different products")).toBe(
      LINE_LIMIT_MESSAGE,
    );
  });
});

test.describe("the backend's limit messages, as a shopper reads them", () => {
  test("a cart line over 99 units", () => {
    expect(toShopperMessage("A cart line holds at most 99 units")).toBe(
      "You can buy up to 99 of one item at a time.",
    );
  });

  test("a cart with more than 50 products", () => {
    expect(toShopperMessage("A cart holds at most 50 different products")).toBe(
      "Your cart can hold at most 50 different products. Remove one to add another.",
    );
  });

  test("the same limits when placing an order", () => {
    expect(
      toShopperMessage("An order holds at most 99 units of one product"),
    ).toBe("You can buy up to 99 of one item at a time.");
    expect(
      toShopperMessage("An order holds at most 50 different products"),
    ).toBe(
      "An order can hold at most 50 different products. Remove some from your cart.",
    );
  });

  test("the validation message for a quantity over the limit", () => {
    expect(toShopperMessage("quantity must not be greater than 99")).toBe(
      "You can buy up to 99 of one item at a time.",
    );
  });

  test("the numbers follow the backend's wording", () => {
    expect(toShopperMessage("A cart line holds at most 120 units")).toBe(
      "You can buy up to 120 of one item at a time.",
    );
  });

  test("other messages are left as they are", () => {
    expect(toShopperMessage("Something else entirely")).toBe(
      "Something else entirely",
    );
  });
});
