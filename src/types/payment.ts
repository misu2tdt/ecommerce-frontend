import type { VndAmount } from "./catalog";
import type { OrderStatus } from "./order";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface Payment {
  id: number;
  provider: string;
  amount: VndAmount;
  currency: "VND";
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  succeededAt: string | null;
  checkoutUrl?: string;
  clientData?: Record<string, string>;
}

// What the demo payment page can send. Never an amount: the backend uses the
// amount stored with the payment.
export type DemoOutcome = "success" | "failure" | "cancel";

export type DemoCompletionResult =
  | "applied"
  | "already_applied"
  | "recorded_for_review";

export interface DemoCompletion {
  outcome: DemoOutcome;
  result: DemoCompletionResult;
  payment: Payment;
  order: { id: number; status: OrderStatus };
}

export interface PaymentReturnOrder {
  orderId: number;
}
