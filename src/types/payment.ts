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

// The tricky cases of the payment simulator (demo store only). The backend also
// accepts success, declined and cancelled; the page keeps its three buttons for
// those and only offers these four.
export type SimulatorScenario =
  | "success_twice"
  | "success_after_expiry"
  | "delayed_success"
  | "invalid_signature";

// What happened to one event or action, as the backend names it.
export type SimulationStepResult =
  | "applied"
  | "already_applied"
  | "duplicate"
  | "recorded_for_review"
  | "rejected_invalid_signature"
  | "expiry_forced"
  | "scheduled";

export interface SimulationStep {
  step: number;
  // What was sent or done, in the backend's words.
  sent: string;
  // One of SimulationStepResult. Typed as text because the page maps it to a
  // short label (lib/payment-simulator.ts) and must survive a code it does not
  // know, which is shown under a neutral label.
  result: string;
  httpStatus: number;
  detail: string;
}

// "completed": everything happened before the answer. "scheduled": the event
// will arrive later (delayed_success).
export type SimulationOutcome = "completed" | "scheduled";

// The answer of POST /payments/:id/demo/simulate. The explanation and the steps
// are the backend's own text and are shown as they come.
export interface DemoSimulation {
  scenario: string;
  outcome: SimulationOutcome;
  explanation: string;
  steps: SimulationStep[];
  payment: Payment;
  order: { id: number; status: OrderStatus };
}

// The payment and order status as read again after a delayed event was due.
export interface PaymentSnapshot {
  payment: PaymentStatus;
  order: OrderStatus;
}

export interface PaymentReturnOrder {
  orderId: number;
}
