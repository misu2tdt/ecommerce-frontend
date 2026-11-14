import { expect, test } from "@playwright/test";
import {
  DEFAULT_RECONCILIATION_FILTER,
  RECONCILIATION_PAGE_SIZE,
  RESOLUTION_NOTE_MAX,
  filterQuery,
  formatEventAmount,
  formatResolver,
  isResolved,
  parseStatusFilter,
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
