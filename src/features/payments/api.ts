import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type { Payment, PaymentReturnOrder } from "@/types/payment";

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

export function resolveMomoPaymentReturn(
  providerPaymentId: string,
): Promise<PaymentReturnOrder> {
  return authenticatedApiFetch<PaymentReturnOrder>(
    `/payments/momo/return/${encodeURIComponent(providerPaymentId)}`,
  );
}
