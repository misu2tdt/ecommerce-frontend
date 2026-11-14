import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import { reconciliationQuery } from "@/lib/reconciliation";
import type {
  ReconciliationItem,
  ReconciliationPage,
  ReconciliationStatusFilter,
} from "@/types/reconciliation";

// GET /admin/payments/reconciliation answers with { items, page, limit, total }
// in the body (not in headers like the other admin lists).
export const getReconciliationPage = (
  status: ReconciliationStatusFilter,
  page: number,
) =>
  authenticatedApiFetch<ReconciliationPage>("/admin/payments/reconciliation", {
    query: reconciliationQuery(status, page),
  });

// How many events still wait for an admin: the total of a one-row page.
export async function getUnresolvedReconciliationCount(): Promise<number> {
  const result = await authenticatedApiFetch<ReconciliationPage>(
    "/admin/payments/reconciliation",
    { query: reconciliationQuery("unresolved", 1, 1) },
  );
  return result.total;
}

export const resolveReconciliationEvent = (eventId: number, note: string) =>
  authenticatedApiFetch<ReconciliationItem>(
    `/admin/payments/reconciliation/${eventId}/resolve`,
    { method: "POST", body: { note } },
  );
