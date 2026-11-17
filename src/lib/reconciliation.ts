// Pure rules of the payment reconciliation queue: which filter an address
// asks for, the query sent to the backend, the links between filters and pages,
// and the check of the note an admin writes when resolving an event.

import type { ApiQuery } from "@/lib/api";
import { parseId } from "@/lib/ids";
import { ID_MAX } from "@/lib/limits";
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

// The largest order id the backend accepts (a PostgreSQL integer). A bigger
// number could not match any order and the backend answers 400 for it.
export const ORDER_ID_MAX = ID_MAX;

// Reads `?orderId=` from an address: a positive whole number the backend would
// accept, or null. Anything else (letters, 0, a sign, a decimal, a repeated
// parameter, too big) is ignored, never sent to the backend.
export function parseOrderIdParam(
  value: string | string[] | undefined,
): number | null {
  return parseId(value);
}

// The query of one list request. `status` and `orderId` are the backend's own
// parameters; `orderId` is sent only when there is one.
export function reconciliationQuery(
  status: ReconciliationStatusFilter,
  page: number,
  limit: number = RECONCILIATION_PAGE_SIZE,
  orderId: number | null = null,
): ApiQuery {
  return orderId === null
    ? { status, page, limit }
    : { status, page, limit, orderId };
}

// The part of an address that keeps the filters: nothing for the default view,
// so it has one address. The order comes first, as in the link from an order.
export function filterQuery(
  status: ReconciliationStatusFilter,
  orderId: number | null = null,
): string {
  const parts: string[] = [];
  if (orderId !== null) parts.push(`orderId=${orderId}`);
  if (status !== DEFAULT_RECONCILIATION_FILTER) parts.push(`status=${status}`);
  return parts.join("&");
}

export function reconciliationHref(
  status: ReconciliationStatusFilter,
  page = 1,
  orderId: number | null = null,
): string {
  return withPage(RECONCILIATION_PATH, filterQuery(status, orderId), page);
}

// From an order's page: every event of that order, open or resolved.
export function orderReconciliationHref(orderId: number): string {
  return reconciliationHref("all", 1, orderId);
}

// What an empty list says. With an order filter it names the order and the
// status, so it is clear that the filter, not the queue, is empty.
export function reconciliationEmptyState(
  status: ReconciliationStatusFilter,
  orderId: number | null,
): { title: string; description: string } {
  if (orderId !== null) {
    const what: Record<ReconciliationStatusFilter, string> = {
      unresolved: "has no unresolved payment events",
      resolved: "has no resolved payment events",
      all: "has no payment events that needed reconciliation",
    };
    return {
      title: `No events for order #${orderId}`,
      description: `Order #${orderId} ${what[status]}. Clear the order filter to see the whole queue.`,
    };
  }
  const general: Record<
    ReconciliationStatusFilter,
    { title: string; description: string }
  > = {
    unresolved: {
      title: "Nothing to reconcile",
      description:
        "No payment events are waiting for an admin. An event appears here when a payment result could not be applied cleanly, for example a success that arrives after the order was cancelled.",
    },
    resolved: {
      title: "No resolved events",
      description: "Events that an admin has handled will be listed here.",
    },
    all: {
      title: "No payment events to show",
      description:
        "Events that need an admin, and the ones already handled, will be listed here.",
    },
  };
  return general[status];
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
