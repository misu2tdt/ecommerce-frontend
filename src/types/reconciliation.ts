import type { VndAmount } from "@/types/catalog";
import type { OrderStatus } from "@/types/order";

// The status filter of GET /admin/payments/reconciliation.
export type ReconciliationStatusFilter = "unresolved" | "resolved" | "all";

// One payment event an admin has to look at, as the backend returns it. The
// strings (eventType, payment.status, provider) are shown exactly as received.
export interface ReconciliationItem {
  id: number;
  createdAt: string;
  eventType: string;
  processingMessage: string | null;
  provider: string;
  providerPaymentId: string;
  payment: {
    id: number;
    status: string;
    amount: VndAmount;
    currency: string;
  };
  order: { id: number; status: OrderStatus; userId: number };
  // A hint computed by the backend, never stored.
  suggestedAction: string;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resolutionNote: string | null;
}

export interface ReconciliationPage {
  items: ReconciliationItem[];
  page: number;
  limit: number;
  total: number;
}
