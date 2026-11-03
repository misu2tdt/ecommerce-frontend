import { expect, test } from "@playwright/test";
import {
  CATALOG_PAGE_SIZE,
  LIST_PAGE_SIZE,
  pageItems,
  pageRange,
  parsePageParam,
  pageRedirectTarget,
  readPagination,
  withPage,
} from "@/lib/pagination";

test.describe("parsePageParam", () => {
  test("no parameter means page 1", () => {
    expect(parsePageParam(undefined)).toEqual({ page: 1, valid: true });
  });

  test("a whole number from 1 is taken as it is", () => {
    expect(parsePageParam("1")).toEqual({ page: 1, valid: true });
    expect(parsePageParam("7")).toEqual({ page: 7, valid: true });
    expect(parsePageParam(["3", "9"])).toEqual({ page: 3, valid: true });
  });

  test.describe("anything else is invalid and falls back to page 1", () => {
    for (const value of ["0", "-1", "abc", "1.5", "1e1", "0x10", " 2", "", "99999999999", "NaN"]) {
      test(`"${value}"`, () => {
        expect(parsePageParam(value)).toEqual({ page: 1, valid: false });
      });
    }
  });
});

test.describe("pageItems (the numbers shown in the pager)", () => {
  test("a short list shows every page", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test("near the start it shows the first pages, an ellipsis and the last", () => {
    expect(pageItems(1, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
    expect(pageItems(3, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
  });

  test("in the middle it shows both ends, an ellipsis each side and the neighbours", () => {
    expect(pageItems(10, 20)).toEqual([
      1,
      "ellipsis",
      9,
      10,
      11,
      "ellipsis",
      20,
    ]);
  });

  test("near the end it shows the first page, an ellipsis and the last pages", () => {
    expect(pageItems(20, 20)).toEqual([1, "ellipsis", 16, 17, 18, 19, 20]);
    expect(pageItems(18, 20)).toEqual([1, "ellipsis", 16, 17, 18, 19, 20]);
  });

  test("an ellipsis only ever hides two or more pages", () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const items = pageItems(current, total);
        items.forEach((item, index) => {
          if (item !== "ellipsis") return;
          const before = items[index - 1] as number;
          const after = items[index + 1] as number;
          expect(after - before, `${current} of ${total}`).toBeGreaterThan(2);
        });
      }
    }
  });

  test("the list is increasing, unique, and always has the current, first and last page", () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const numbers = pageItems(current, total).filter(
          (item): item is number => item !== "ellipsis",
        );
        expect(numbers).toEqual([...new Set(numbers)].sort((a, b) => a - b));
        expect(numbers).toContain(current);
        expect(numbers[0]).toBe(1);
        expect(numbers.at(-1)).toBe(total);
      }
    }
  });

  test("there is nothing to show when there are no pages", () => {
    expect(pageItems(1, 0)).toEqual([]);
  });
});

test.describe("pageRedirectTarget", () => {
  test("a page inside the range, or no pages at all on page 1, needs no redirect", () => {
    expect(pageRedirectTarget({ page: 2, valid: true }, 5)).toBeNull();
    expect(pageRedirectTarget({ page: 1, valid: true }, 0)).toBeNull();
    expect(pageRedirectTarget({ page: 5, valid: true }, 5)).toBeNull();
  });

  test("a page past the end goes to the last page", () => {
    expect(pageRedirectTarget({ page: 9, valid: true }, 5)).toBe(5);
  });

  test("a page when nothing matches goes to page 1", () => {
    expect(pageRedirectTarget({ page: 3, valid: true }, 0)).toBe(1);
  });

  test("an invalid parameter is cleaned up by going to page 1", () => {
    expect(pageRedirectTarget({ page: 1, valid: false }, 5)).toBe(1);
  });
});

test.describe("pageRange", () => {
  test("names the rows shown, like 13 to 24", () => {
    expect(pageRange(2, 12, 30)).toEqual({ from: 13, to: 24 });
    expect(pageRange(3, 12, 30)).toEqual({ from: 25, to: 30 });
    expect(pageRange(1, 12, 5)).toEqual({ from: 1, to: 5 });
  });

  test("shows nothing when there are no rows", () => {
    expect(pageRange(1, 12, 0)).toEqual({ from: 0, to: 0 });
  });
});

test.describe("withPage", () => {
  test("page 1 has no page parameter, so the first page has one canonical address", () => {
    expect(withPage("/products", "category=t-shirts-tops", 1)).toBe(
      "/products?category=t-shirts-tops",
    );
    expect(withPage("/products", "", 1)).toBe("/products");
  });

  test("other pages add the parameter after the filters", () => {
    expect(withPage("/products", "category=t-shirts-tops&sort=newest", 3)).toBe(
      "/products?category=t-shirts-tops&sort=newest&page=3",
    );
    expect(withPage("/account/orders", "", 2)).toBe("/account/orders?page=2");
  });

  test("an existing page parameter is replaced, not repeated", () => {
    expect(withPage("/products", "page=4&sort=newest", 2)).toBe(
      "/products?sort=newest&page=2",
    );
    expect(withPage("/products", "page=4&sort=newest", 1)).toBe(
      "/products?sort=newest",
    );
  });
});

test.describe("readPagination", () => {
  const headers = (values: Record<string, string>) => new Headers(values);

  test("reads the totals the backend sends", () => {
    expect(
      readPagination(
        headers({
          "x-total-count": "30",
          "x-total-pages": "3",
          "x-page": "2",
          "x-limit": "12",
        }),
        12,
      ),
    ).toEqual({ total: 30, totalPages: 3, page: 2, limit: 12 });
  });

  test("falls back to a single page when a backend sends no totals", () => {
    expect(readPagination(headers({}), 7)).toEqual({
      total: 7,
      totalPages: 1,
      page: 1,
      limit: 7,
    });
  });

  test("ignores nonsense totals", () => {
    expect(
      readPagination(
        headers({ "x-total-count": "many", "x-total-pages": "-2" }),
        4,
      ),
    ).toEqual({ total: 4, totalPages: 1, page: 1, limit: 4 });
  });
});

test.describe("page sizes", () => {
  test("match what the backend allows", () => {
    expect(CATALOG_PAGE_SIZE).toBe(12);
    expect(LIST_PAGE_SIZE).toBe(20);
  });
});
