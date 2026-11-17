import { expect, test } from "@playwright/test";
import { parseId, readIdField } from "@/lib/ids";
import {
  CART_LINES_MAX,
  ID_MAX,
  POSITION_MAX,
  PRICE_MAX_VND,
  QUANTITY_MAX_PER_LINE,
  STOCK_MAX,
} from "@/lib/limits";
import { parseOrderIdParam } from "@/lib/reconciliation";

test.describe("the limits mirror the backend", () => {
  test("have the values the backend enforces", () => {
    expect(ID_MAX).toBe(2_147_483_647);
    expect(PRICE_MAX_VND).toBe(1_000_000_000_000);
    expect(QUANTITY_MAX_PER_LINE).toBe(99);
    expect(CART_LINES_MAX).toBe(50);
    expect(STOCK_MAX).toBe(1_000_000);
    expect(POSITION_MAX).toBe(10_000);
  });

  test("an order total at every limit still fits a safe integer", () => {
    expect(
      PRICE_MAX_VND * QUANTITY_MAX_PER_LINE * CART_LINES_MAX,
    ).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

test.describe("the id parser", () => {
  test("accepts whole numbers from 1 to the largest id", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
    expect(parseId("2147483647")).toBe(2_147_483_647);
  });

  test("refuses everything above the largest id", () => {
    for (const value of [
      "2147483648",
      "9999999999",
      "99999999999",
      "9007199254740993",
      "123456789012345678901234567890",
    ]) {
      expect(parseId(value), value).toBeNull();
    }
  });

  test("refuses zero, signs, decimals, exponents, spaces and text", () => {
    for (const value of [
      "0",
      "00",
      "007",
      "-1",
      "+1",
      "1.5",
      "1.0",
      "1e3",
      "0x10",
      " 7",
      "7 ",
      "7\n",
      "",
      "abc",
      "NaN",
      "Infinity",
      "１２",
    ]) {
      expect(parseId(value), JSON.stringify(value)).toBeNull();
    }
  });

  test("refuses anything that is not a string", () => {
    for (const value of [undefined, null, 7, 1.5, NaN, {}, [], ["7"]]) {
      expect(parseId(value)).toBeNull();
    }
  });

  test("reads a form field, and an absent or file field is not an id", () => {
    const form = new FormData();
    form.set("id", "12");
    form.set("big", "2147483648");
    form.set("file", new File(["x"], "x.txt"));
    expect(readIdField(form, "id")).toBe(12);
    expect(readIdField(form, "big")).toBeNull();
    expect(readIdField(form, "missing")).toBeNull();
    expect(readIdField(form, "file")).toBeNull();
  });

  test("the reconciliation order filter uses the same rule", () => {
    expect(parseOrderIdParam("2147483647")).toBe(2_147_483_647);
    expect(parseOrderIdParam("2147483648")).toBeNull();
    expect(parseOrderIdParam(["7"])).toBeNull();
  });
});
