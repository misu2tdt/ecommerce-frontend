import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type {
  DemoCompletion,
  DemoOutcome,
  DemoSimulation,
  Payment,
  PaymentReturnOrder,
  SimulatorScenario,
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

// Demo store only. Runs one tricky case on an open demo payment of the signed-in
// customer. Only the scenario is sent: the backend builds and signs every event
// itself, so nothing here can tamper with an amount or a signature.
export function simulateDemoPayment(
  paymentId: number,
  scenario: SimulatorScenario,
): Promise<DemoSimulation> {
  return authenticatedApiFetch<DemoSimulation>(
    `/payments/${paymentId}/demo/simulate`,
    { method: "POST", body: { scenario } },
  );
}

export function resolveMomoPaymentReturn(
  providerPaymentId: string,
): Promise<PaymentReturnOrder> {
  return authenticatedApiFetch<PaymentReturnOrder>(
    `/payments/momo/return/${encodeURIComponent(providerPaymentId)}`,
  );
}
