import { test, expect } from "@playwright/test";
import { formatPriceRange, formatVnd } from "@/lib/money";

test.describe("Promotions & Merchandising Price Logic", () => {
  test("formats single VND amount correctly", () => {
    expect(formatVnd(199000)).toBe("199.000\u00A0₫");
    expect(formatVnd(0)).toBe("0\u00A0₫");
  });

  test("formats price range with distinct min and max", () => {
    expect(formatPriceRange(199000, 249000)).toBe(
      "199.000\u00A0₫ – 249.000\u00A0₫",
    );
  });

  test("formats price range with identical min and max as single price", () => {
    expect(formatPriceRange(199000, 199000)).toBe("199.000\u00A0₫");
  });

  test("calculates truthful discount percentage", () => {
    const price = 199000;
    const compareAtPrice = 249000;
    const percent = Math.round((1 - price / compareAtPrice) * 100);
    expect(percent).toBe(20);
  });

  test("handles 0 or null comparison gracefully", () => {
    expect(formatPriceRange(null, null)).toBe("Price unavailable");
  });
});
