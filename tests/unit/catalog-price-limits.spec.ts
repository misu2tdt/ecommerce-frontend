import { expect, test } from "@playwright/test";
import {
  hasIgnoredPriceFilter,
  parseProductFilters,
  readNumber,
} from "@/features/catalog/search-params";
import { PRICE_MAX_VND } from "@/lib/limits";

test.describe("readNumber (a price from the address)", () => {
  test("keeps a price from 0 to the limit, in whole VND", () => {
    expect(readNumber("0")).toBe(0);
    expect(readNumber("250000")).toBe(250_000);
    expect(readNumber(" 1500.9 ")).toBe(1500);
    expect(readNumber(String(PRICE_MAX_VND))).toBe(PRICE_MAX_VND);
    expect(readNumber(["300000", "5"])).toBe(300_000);
  });

  test("drops a price above the limit", () => {
    expect(readNumber(String(PRICE_MAX_VND + 1))).toBeUndefined();
    expect(readNumber("2000000000000")).toBeUndefined();
    expect(readNumber("1e30")).toBeUndefined();
  });

  test("drops text, negatives and infinity", () => {
    for (const value of ["abc", "-1", "Infinity", "NaN", "1,5"]) {
      expect(readNumber(value), value).toBeUndefined();
    }
  });

  test("an empty or absent price is simply not set", () => {
    expect(readNumber(undefined)).toBeUndefined();
    expect(readNumber("")).toBeUndefined();
    expect(readNumber("   ")).toBeUndefined();
  });
});

test.describe("the filters read from the address", () => {
  test("never carry a price the backend would refuse", () => {
    const filters = parseProductFilters({
      minPrice: "2000000000000",
      maxPrice: "500000",
      q: "sock",
    });
    expect(filters.minPrice).toBeUndefined();
    expect(filters.maxPrice).toBe(500_000);
    expect(filters.q).toBe("sock");
  });
});

test.describe("when the page says the price filter was ignored", () => {
  test("for a price above the limit, text or a negative", () => {
    expect(hasIgnoredPriceFilter({ minPrice: "2000000000000" })).toBe(true);
    expect(hasIgnoredPriceFilter({ maxPrice: "abc" })).toBe(true);
    expect(hasIgnoredPriceFilter({ minPrice: "-5" })).toBe(true);
    expect(
      hasIgnoredPriceFilter({ minPrice: "100", maxPrice: "1e30" }),
    ).toBe(true);
  });

  test("not for a usable price, an empty one or none", () => {
    expect(hasIgnoredPriceFilter({})).toBe(false);
    expect(hasIgnoredPriceFilter({ minPrice: "", maxPrice: "  " })).toBe(false);
    expect(
      hasIgnoredPriceFilter({ minPrice: "0", maxPrice: String(PRICE_MAX_VND) }),
    ).toBe(false);
    expect(hasIgnoredPriceFilter({ q: "shoes", minPrice: undefined })).toBe(
      false,
    );
  });
});
