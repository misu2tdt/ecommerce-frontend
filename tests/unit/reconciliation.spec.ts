import { expect, test } from "@playwright/test";
import {
  DEFAULT_RECONCILIATION_FILTER,
  ORDER_ID_MAX,
  RECONCILIATION_PAGE_SIZE,
  RESOLUTION_NOTE_MAX,
  filterQuery,
  formatEventAmount,
  formatResolver,
  isResolved,
  orderReconciliationHref,
  parseOrderIdParam,
  parseStatusFilter,
  reconciliationEmptyState,
  reconciliationHref,
  reconciliationQuery,
  totalPagesOf,
  trimmedNoteLength,
  validateResolutionNote,
} from "@/lib/reconciliation";

test.describe("reconciliation status filter", () => {
  test("reads the three values the backend knows", () => {
    expect(parseStatusFilter("unresolved")).toBe("unresolved");
    expect(parseStatusFilter("resolved")).toBe("resolved");
    expect(parseStatusFilter("all")).toBe("all");
  });

  test("falls back to unresolved for anything else", () => {
    expect(DEFAULT_RECONCILIATION_FILTER).toBe("unresolved");
    expect(parseStatusFilter(undefined)).toBe("unresolved");
    expect(parseStatusFilter("")).toBe("unresolved");
    expect(parseStatusFilter("RESOLVED")).toBe("unresolved");
    expect(parseStatusFilter("open")).toBe("unresolved");
  });

  test("reads the first value when the parameter is repeated", () => {
    expect(parseStatusFilter(["all", "resolved"])).toBe("all");
    expect(parseStatusFilter([])).toBe("unresolved");
  });
});

test.describe("reconciliation list query", () => {
  test("sends the filter as the backend's status parameter, 20 a page", () => {
    expect(RECONCILIATION_PAGE_SIZE).toBe(20);
    expect(reconciliationQuery("resolved", 3)).toEqual({
      status: "resolved",
      page: 3,
      limit: 20,
    });
  });

  test("never asks for more than the backend's limit of 100", () => {
    expect(RECONCILIATION_PAGE_SIZE).toBeLessThanOrEqual(100);
  });

  test("a one-row page for the dashboard count", () => {
    expect(reconciliationQuery("unresolved", 1, 1)).toEqual({
      status: "unresolved",
      page: 1,
      limit: 1,
    });
  });
});

test.describe("reconciliation addresses", () => {
  test("the default view has one address, without a status", () => {
    expect(filterQuery("unresolved")).toBe("");
    expect(reconciliationHref("unresolved")).toBe("/admin/reconciliation");
    expect(reconciliationHref("unresolved", 1)).toBe("/admin/reconciliation");
  });

  test("other filters and pages are kept in the address", () => {
    expect(filterQuery("resolved")).toBe("status=resolved");
    expect(reconciliationHref("resolved")).toBe(
      "/admin/reconciliation?status=resolved",
    );
    expect(reconciliationHref("all", 2)).toBe(
      "/admin/reconciliation?status=all&page=2",
    );
    expect(reconciliationHref("unresolved", 4)).toBe(
      "/admin/reconciliation?page=4",
    );
  });

  test("counts pages from the total", () => {
    expect(totalPagesOf(0, 20)).toBe(0);
    expect(totalPagesOf(1, 20)).toBe(1);
    expect(totalPagesOf(20, 20)).toBe(1);
    expect(totalPagesOf(21, 20)).toBe(2);
    expect(totalPagesOf(5, 0)).toBe(0);
  });
});

test.describe("resolution note", () => {
  test("accepts 3 to 500 characters after trimming", () => {
    expect(validateResolutionNote("abc")).toEqual({ valid: true, note: "abc" });
    expect(validateResolutionNote("  Refunded in the portal  ")).toEqual({
      valid: true,
      note: "Refunded in the portal",
    });
    expect(validateResolutionNote("x".repeat(RESOLUTION_NOTE_MAX))).toMatchObject(
      { valid: true },
    );
  });

  test("rejects a note that is too short, also when padded with spaces", () => {
    expect(validateResolutionNote("")).toMatchObject({ valid: false });
    expect(validateResolutionNote("ab")).toMatchObject({ valid: false });
    expect(validateResolutionNote("   ab   ")).toMatchObject({ valid: false });
    expect(validateResolutionNote("      ")).toMatchObject({ valid: false });
  });

  test("rejects a note over 500 characters, but not one padded to it", () => {
    const tooLong = validateResolutionNote("x".repeat(RESOLUTION_NOTE_MAX + 1));
    expect(tooLong).toMatchObject({ valid: false });
    expect(tooLong.valid ? "" : tooLong.message).toContain("500");
    expect(
      validateResolutionNote(`  ${"x".repeat(RESOLUTION_NOTE_MAX)}  `),
    ).toMatchObject({ valid: true });
  });

  test("counts the trimmed length, which is what the backend counts", () => {
    expect(trimmedNoteLength("  abc  ")).toBe(3);
    expect(trimmedNoteLength("")).toBe(0);
  });
});

test.describe("reconciliation text", () => {
  test("names the admin by the id the backend returns", () => {
    expect(formatResolver(3)).toBe("Admin #3");
    expect(formatResolver(null)).toBe("Unknown admin");
  });

  test("shows VND amounts as money and other currencies as received", () => {
    expect(formatEventAmount(24990000, "VND")).toBe("24.990.000 ₫");
    expect(formatEventAmount(25, "USD")).toBe("25 USD");
  });

  test("tells resolved events from open ones by resolvedAt", () => {
    expect(isResolved({ resolvedAt: null })).toBe(false);
    expect(isResolved({ resolvedAt: "2026-10-28T10:15:00.000Z" })).toBe(true);
  });
});

test.describe("reconciliation order filter", () => {
  test("reads a positive whole number", () => {
    expect(parseOrderIdParam("1")).toBe(1);
    expect(parseOrderIdParam("42")).toBe(42);
    expect(parseOrderIdParam(String(ORDER_ID_MAX))).toBe(ORDER_ID_MAX);
  });

  test("ignores everything the backend would refuse", () => {
    for (const value of [
      undefined,
      "",
      "0",
      "-1",
      "+5",
      "1.5",
      "abc",
      "1e1",
      "0x10",
      " 2",
      "2 ",
      "007",
      String(ORDER_ID_MAX + 1),
      "99999999999999999999",
      ["1", "2"],
      [],
    ]) {
      expect(parseOrderIdParam(value), JSON.stringify(value)).toBeNull();
    }
  });

  test("is sent to the backend only when there is one", () => {
    expect(reconciliationQuery("all", 1, 20, 7)).toEqual({
      status: "all",
      page: 1,
      limit: 20,
      orderId: 7,
    });
    expect(reconciliationQuery("all", 1, 20, null)).toEqual({
      status: "all",
      page: 1,
      limit: 20,
    });
    expect(reconciliationQuery("all", 1, 20)).not.toHaveProperty("orderId");
  });

  test("stays in the address with the status and the page", () => {
    expect(filterQuery("unresolved", 7)).toBe("orderId=7");
    expect(filterQuery("all", 7)).toBe("orderId=7&status=all");
    expect(filterQuery("resolved", null)).toBe("status=resolved");
    expect(reconciliationHref("unresolved", 1, 7)).toBe(
      "/admin/reconciliation?orderId=7",
    );
    expect(reconciliationHref("resolved", 1, 7)).toBe(
      "/admin/reconciliation?orderId=7&status=resolved",
    );
    expect(reconciliationHref("all", 3, 7)).toBe(
      "/admin/reconciliation?orderId=7&status=all&page=3",
    );
    // Clearing the order keeps the status.
    expect(reconciliationHref("resolved")).toBe(
      "/admin/reconciliation?status=resolved",
    );
  });

  test("the link from an order shows every event of it", () => {
    expect(orderReconciliationHref(12)).toBe(
      "/admin/reconciliation?orderId=12&status=all",
    );
  });

  test("an empty list names the order and the status", () => {
    expect(reconciliationEmptyState("unresolved", null).title).toBe(
      "Nothing to reconcile",
    );
    expect(reconciliationEmptyState("all", 9).title).toBe(
      "No events for order #9",
    );
    expect(reconciliationEmptyState("unresolved", 9).description).toContain(
      "no unresolved payment events",
    );
    expect(reconciliationEmptyState("resolved", 9).description).toContain(
      "no resolved payment events",
    );
    expect(reconciliationEmptyState("all", 9).description).toContain(
      "Order #9 has no payment events",
    );
    expect(reconciliationEmptyState("all", 9).description).toContain(
      "Clear the order filter",
    );
  });
});