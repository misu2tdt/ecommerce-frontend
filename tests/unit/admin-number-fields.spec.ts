import { expect, test } from "@playwright/test";
import {
  fieldErrorsFromBackend,
  maxMessage,
  parseNumberField,
} from "@/features/admin/number-fields";
import { POSITION_MAX, PRICE_MAX_VND, STOCK_MAX } from "@/lib/limits";

test.describe("the number fields of the admin forms", () => {
  test("accept whole numbers from 0 to the field's maximum", () => {
    expect(parseNumberField("price", "0")).toEqual({ value: 0 });
    expect(parseNumberField("price", String(PRICE_MAX_VND))).toEqual({
      value: PRICE_MAX_VND,
    });
    expect(parseNumberField("stock", String(STOCK_MAX))).toEqual({
      value: STOCK_MAX,
    });
    expect(parseNumberField("position", String(POSITION_MAX))).toEqual({
      value: POSITION_MAX,
    });
    expect(parseNumberField("stock", " 12 ")).toEqual({ value: 12 });
  });

  test("refuse one more than the maximum, naming the field and the limit", () => {
    const price = parseNumberField("price", String(PRICE_MAX_VND + 1));
    const stock = parseNumberField("stock", String(STOCK_MAX + 1));
    const position = parseNumberField("position", String(POSITION_MAX + 1));
    expect(price).toEqual({ error: maxMessage("price") });
    expect(stock).toEqual({ error: "Stock must be at most 1,000,000." });
    expect(position).toEqual({ error: "Position must be at most 10,000." });
    expect(maxMessage("price")).toMatch(/^Price must be at most .*1\.000\.000\.000\.000/);
  });

  test("refuse text, decimals, negatives, an empty field and numbers too big for JavaScript", () => {
    for (const raw of ["", "abc", "1.5", "-1", "1e3", "12 3", "99999999999999999999"]) {
      expect(parseNumberField("stock", raw), JSON.stringify(raw)).toHaveProperty(
        "error",
      );
    }
    expect(parseNumberField("stock", "abc")).toEqual({
      error: "Stock must be a whole number, 0 or more.",
    });
  });
});

test.describe("the backend's own refusal of a number, as a field message", () => {
  test("names the field", () => {
    expect(
      fieldErrorsFromBackend("price must not be greater than 1000000000000"),
    ).toEqual({ price: maxMessage("price") });
    expect(
      fieldErrorsFromBackend("stock must not be greater than 1000000"),
    ).toEqual({ stock: maxMessage("stock") });
  });

  test("handles several messages joined together", () => {
    expect(
      fieldErrorsFromBackend(
        "price must not be greater than 1000000000000 stock must not be greater than 1000000",
      ),
    ).toEqual({ price: maxMessage("price"), stock: maxMessage("stock") });
  });

  test("maps compareAtPrice to the price field", () => {
    expect(
      fieldErrorsFromBackend("compareAtPrice must not be greater than 1000000000000"),
    ).toEqual({ price: maxMessage("price") });
  });

  test("leaves any other message alone", () => {
    expect(fieldErrorsFromBackend("SKU already exists")).toBeNull();
    expect(fieldErrorsFromBackend("A number or value is out of range")).toBeNull();
    expect(fieldErrorsFromBackend("")).toBeNull();
  });
});
