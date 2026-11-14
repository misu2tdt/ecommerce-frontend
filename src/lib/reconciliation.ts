// Pure rules of the payment reconciliation queue: which filter an address
// asks for, the query sent to the backend, the links between filters and pages,
// and the check of the note an admin writes when resolving an event.

import type { ApiQuery } from "@/lib/api";
import { formatVnd } from "@/lib/money";
import { withPage } from "@/lib/pagination";
import type { ReconciliationStatusFilter } from "@/types/reconciliation";

export const RECONCILIATION_PATH = "/admin/reconciliation";
// The backend accepts up to 100 a page; the admin lists show 20.
export const RECONCILIATION_PAGE_SIZE = 20;
export const DEFAULT_RECONCILIATION_FILTER: ReconciliationStatusFilter =
  "unresolved";

// The backend's limits for a resolution note, counted after trimming.
export const RESOLUTION_NOTE_MIN = 3;
export const RESOLUTION_NOTE_MAX = 500;

export const RECONCILIATION_FILTERS: ReadonlyArray<{
  value: ReconciliationStatusFilter;
  label: string;
}> = [
  { value: "unresolved", label: "Unresolved" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

// Reads `?status=` from an address. Only the three values the backend knows
// count; anything else (or nothing) is the default, unresolved.
export function parseStatusFilter(
  value: string | string[] | undefined,
): ReconciliationStatusFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  return RECONCILIATION_FILTERS.some((filter) => filter.value === candidate)
    ? (candidate as ReconciliationStatusFilter)
    : DEFAULT_RECONCILIATION_FILTER;
}

// The query of one list request. `status` is the backend's own parameter.
export function reconciliationQuery(
  status: ReconciliationStatusFilter,
  page: number,
  limit: number = RECONCILIATION_PAGE_SIZE,
): ApiQuery {
  return { status, page, limit };
}

// The part of an address that keeps the filter: nothing for the default, so the
// default view has one address.
export function filterQuery(status: ReconciliationStatusFilter): string {
  return status === DEFAULT_RECONCILIATION_FILTER ? "" : `status=${status}`;
}

export function reconciliationHref(
  status: ReconciliationStatusFilter,
  page = 1,
): string {
  return withPage(RECONCILIATION_PATH, filterQuery(status), page);
}

export function totalPagesOf(total: number, limit: number): number {
  return limit > 0 ? Math.ceil(total / limit) : 0;
}

export function trimmedNoteLength(raw: string): number {
  return raw.trim().length;
}

export type NoteCheck =
  | { valid: true; note: string }
  | { valid: false; message: string };

// The note the backend will accept: 3 to 500 characters after trimming.
export function validateResolutionNote(raw: string): NoteCheck {
  const note = raw.trim();
  if (note.length < RESOLUTION_NOTE_MIN) {
    return {
      valid: false,
      message: `Write at least ${RESOLUTION_NOTE_MIN} characters about what was done.`,
    };
  }
  if (note.length > RESOLUTION_NOTE_MAX) {
    return {
      valid: false,
      message: `The note can be at most ${RESOLUTION_NOTE_MAX} characters.`,
    };
  }
  return { valid: true, note };
}

// The backend stores the admin's id only, so that is what is shown.
export function formatResolver(userId: number | null): string {
  return userId === null ? "Unknown admin" : `Admin #${userId}`;
}

// The backend keeps whole units of the payment's currency (VND in this shop).
export function formatEventAmount(amount: number, currency: string): string {
  return currency === "VND" ? formatVnd(amount) : `${amount} ${currency}`;
}

export function isResolved(item: { resolvedAt: string | null }): boolean {
  return item.resolvedAt !== null;
}
