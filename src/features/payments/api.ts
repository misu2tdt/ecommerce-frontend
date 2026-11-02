import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type {
  DemoCompletion,
  DemoOutcome,
  Payment,
  PaymentReturnOrder,
} from "@/types/payment";

export function getOrderPayments(orderId: number): Promise<Payment[]> {
  return authenticatedApiFetch<Payment[]>(`/orders/${orderId}/payments`);
}

export function createOrderPayment(
  orderId: number,
  idempotencyKey: string,
): Promise<Payment> {
  return authenticatedApiFetch<Payment>(`/orders/${orderId}/payments`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

// Demo store only (the backend answers 404 unless demo payments are on). Only
// the outcome is sent: amount and currency come from the stored payment.
export function completeDemoPayment(
  paymentId: number,
  outcome: DemoOutcome,
): Promise<DemoCompletion> {
  return authenticatedApiFetch<DemoCompletion>(
    `/payments/${paymentId}/demo/complete`,
    { method: "POST", body: { outcome } },
  );
}

export function resolveMomoPaymentReturn(
  providerPaymentId: string,
): Promise<PaymentReturnOrder> {
  return authenticatedApiFetch<PaymentReturnOrder>(
    `/payments/momo/return/${encodeURIComponent(providerPaymentId)}`,
  );
}
