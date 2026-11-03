import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  formatDate,
  formatDateTime,
  formatPaymentDeadline,
} from "@/lib/dates";

// Every date in the store is shown in Vietnam time, in one fixed format, so the
// server and the browser always print the same text.

test.describe("formatDateTime", () => {
  test("shows Vietnam time (UTC+7) like 3 Nov 2026, 02:13", () => {
    expect(formatDateTime("2026-11-02T19:13:00Z")).toBe("3 Nov 2026, 02:13");
  });

  test("keeps the day just before midnight in Vietnam", () => {
    expect(formatDateTime("2026-11-02T16:59:00Z")).toBe("2 Nov 2026, 23:59");
  });

  test("shows midnight as 00:00, never 24:00", () => {
    expect(formatDateTime("2026-11-02T17:00:00Z")).toBe("3 Nov 2026, 00:00");
  });

  test("rolls over the year", () => {
    expect(formatDateTime("2026-12-31T17:30:00Z")).toBe("1 Jan 2027, 00:30");
  });

  test("always abbreviates the month to three letters", () => {
    expect(formatDateTime("2026-09-05T03:00:00Z")).toBe("5 Sep 2026, 10:00");
  });

  test("pads minutes and the hour", () => {
    expect(formatDateTime("2026-03-01T22:05:00Z")).toBe("2 Mar 2026, 05:05");
  });

  test("accepts timestamps with milliseconds and an offset", () => {
    expect(formatDateTime("2026-11-02T19:13:00.000Z")).toBe("3 Nov 2026, 02:13");
    expect(formatDateTime("2026-11-03T02:13:00+07:00")).toBe("3 Nov 2026, 02:13");
  });

  test("says so when the value is not a date", () => {
    expect(formatDateTime("not a date")).toBe("Date unavailable");
    expect(formatDateTime("")).toBe("Date unavailable");
  });
});

test.describe("formatDate", () => {
  test("shows only the Vietnam date", () => {
    expect(formatDate("2026-11-02T19:13:00Z")).toBe("3 Nov 2026");
    expect(formatDate("2026-11-02T16:59:00Z")).toBe("2 Nov 2026");
    expect(formatDate("nope")).toBe("Date unavailable");
  });
});

test.describe("formatPaymentDeadline", () => {
  test("names the time zone so the time cannot be misread", () => {
    expect(formatPaymentDeadline("2026-11-02T19:43:00Z")).toBe(
      "3 Nov 2026, 02:43 (Vietnam time)",
    );
  });
});

// One formatter for the whole app: a date written with a locale call somewhere
// else would print in the visitor's or the server's time zone instead.
test.describe("date formatting guard", () => {
  const sourceRoot = path.resolve(process.cwd(), "src");
  const allowed = new Set([path.join(sourceRoot, "lib", "dates.ts")]);
  const forbidden =
    /\.toLocale(?:Date|Time)?String\s*\(|Intl\s*\.\s*DateTimeFormat|Intl\s*\.\s*RelativeTimeFormat/;

  function sourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
      const full = path.join(directory, name);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(?:ts|tsx)$/.test(name) ? [full] : [];
    });
  }

  test("only src/lib/dates.ts formats dates", () => {
    const offenders = sourceFiles(sourceRoot)
      .filter((file) => !allowed.has(file))
      .filter((file) => forbidden.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
