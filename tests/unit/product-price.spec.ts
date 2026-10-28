import { expect, test } from "@playwright/test";
import { getProductCardPrice } from "@/lib/product-price";

test.describe("product card price logic", () => {
  test("shows nothing to compute when the price is unavailable", () => {
    expect(
      getProductCardPrice({ minPrice: null, maxPrice: null }),
    ).toBeNull();
    expect(
      getProductCardPrice({ minPrice: 199000, maxPrice: null }),
    ).toBeNull();
  });

  test("equal prices without a compare-at price: one plain price", () => {
    expect(
      getProductCardPrice({ minPrice: 199000, maxPrice: 199000 }),
    ).toEqual({
      amount: 199000,
      isRange: false,
      compareAt: null,
      discountPercent: null,
    });
  });

  test("single discount: struck-through compare-at price and a percentage", () => {
    expect(
      getProductCardPrice({
        minPrice: 199000,
        maxPrice: 199000,
        minCompareAtPrice: 249000,
        maxCompareAtPrice: 249000,
      }),
    ).toEqual({
      amount: 199000,
      isRange: false,
      compareAt: 249000,
      discountPercent: 20,
    });
  });

  test("a price range starts at the lowest price and is marked as a range", () => {
    expect(
      getProductCardPrice({ minPrice: 199000, maxPrice: 299000 }),
    ).toEqual({
      amount: 199000,
      isRange: true,
      compareAt: null,
      discountPercent: null,
    });
  });

  test("a discounted range uses the lowest price and its compare-at price", () => {
    expect(
      getProductCardPrice({
        minPrice: 199000,
        maxPrice: 299000,
        minCompareAtPrice: 249000,
        maxCompareAtPrice: 349000,
      }),
    ).toEqual({
      amount: 199000,
      isRange: true,
      compareAt: 249000,
      discountPercent: 20,
    });
  });

  test("no compare-at price (null or missing) means no discount", () => {
    for (const input of [
      { minPrice: 199000, maxPrice: 199000 },
      {
        minPrice: 199000,
        maxPrice: 199000,
        minCompareAtPrice: null,
        maxCompareAtPrice: null,
      },
    ]) {
      const price = getProductCardPrice(input);
      expect(price?.compareAt).toBeNull();
      expect(price?.discountPercent).toBeNull();
    }
  });

  test("a compare-at price that is lower than or equal to the price is not a discount", () => {
    for (const compareAt of [150000, 199000]) {
      expect(
        getProductCardPrice({
          minPrice: 199000,
          maxPrice: 199000,
          minCompareAtPrice: compareAt,
          maxCompareAtPrice: compareAt,
        }),
      ).toEqual({
        amount: 199000,
        isRange: false,
        compareAt: null,
        discountPercent: null,
      });
    }
  });

  test("rounds the percentage to the nearest whole number", () => {
    const percent = (price: number, compareAt: number) =>
      getProductCardPrice({
        minPrice: price,
        maxPrice: price,
        minCompareAtPrice: compareAt,
        maxCompareAtPrice: compareAt,
      })?.discountPercent;

    expect(percent(100000, 150000)).toBe(33); // 33.33
    expect(percent(100000, 300000)).toBe(67); // 66.67
    expect(percent(259000, 329000)).toBe(21); // 21.28
  });

  test("a discount that rounds to 0% is not shown", () => {
    expect(
      getProductCardPrice({
        minPrice: 997,
        maxPrice: 997,
        minCompareAtPrice: 1000,
        maxCompareAtPrice: 1000,
      }),
    ).toEqual({
      amount: 997,
      isRange: false,
      compareAt: null,
      discountPercent: null,
    });
  });
});
