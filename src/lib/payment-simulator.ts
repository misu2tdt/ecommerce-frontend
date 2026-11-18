import type {
  DemoSimulation,
  PaymentStatus,
  SimulationStep,
  SimulatorScenario,
} from "@/types/payment";
import type { OrderStatus } from "@/types/order";

// Pure helpers of the "Try a tricky case" section of the demo payment page, kept
// apart from the components so they can be unit tested.

export interface ScenarioChoice {
  scenario: SimulatorScenario;
  // The button, and the one line under it. This is the page's own wording for
  // the choices; what a run explains afterwards is the backend's text, shown as
  // it comes.
  label: string;
  description: string;
}

export const SIMULATOR_SCENARIOS: readonly ScenarioChoice[] = [
  {
    scenario: "success_twice",
    label: "Send success twice",
    description:
      "The same payment confirmation arrives two times. The order is paid only once.",
  },
  {
    scenario: "success_after_expiry",
    label: "Success after the order expired",
    description:
      "The order expires first, then a confirmation arrives too late. It is held for review, not applied.",
  },
  {
    scenario: "delayed_success",
    label: "Delayed success, arrives in 10 s",
    description:
      "The confirmation is slow: the payment waits about 10 seconds before it goes through.",
  },
  {
    scenario: "invalid_signature",
    label: "Tampered signature",
    description:
      "A confirmation that was changed after it was signed. It is rejected and nothing changes.",
  },
];

export function parseSimulatorScenario(
  value: string | null,
): SimulatorScenario | null {
  return (
    SIMULATOR_SCENARIOS.find((choice) => choice.scenario === value)?.scenario ??
    null
  );
}

// ---- what each step ended in ---------------------------------------------------

// The one place that turns a result code of the backend into a short label.
const RESULT_LABELS: Record<string, string> = {
  applied: "Applied",
  already_applied: "Already up to date",
  duplicate: "Ignored: seen before",
  recorded_for_review: "Held for review",
  rejected_invalid_signature: "Rejected: signature does not match",
  expiry_forced: "Order expired now",
  scheduled: "Scheduled for later",
};

// A code this page does not know (a newer backend) still reads calmly.
const UNKNOWN_RESULT_LABEL = "Processed";

export function stepResultLabel(result: string): string {
  return Object.hasOwn(RESULT_LABELS, result)
    ? RESULT_LABELS[result]
    : UNKNOWN_RESULT_LABEL;
}

// ---- the answer of the backend --------------------------------------------------

const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
];
const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseStep(value: unknown): SimulationStep | null {
  if (!isRecord(value)) return null;
  const { step, sent, result, httpStatus, detail } = value;
  if (
    typeof step !== "number" ||
    typeof sent !== "string" ||
    typeof result !== "string" ||
    typeof httpStatus !== "number" ||
    typeof detail !== "string"
  ) {
    return null;
  }
  return { step, sent, result, httpStatus, detail };
}

// The answer only counts when it has the shape this page shows: an explanation,
// steps, and a payment and order with statuses it knows. Anything else is
// treated as a failed run instead of being shown half-way. Unknown extra fields
// and unknown step result codes are fine.
export function parseSimulation(value: unknown): DemoSimulation | null {
  if (!isRecord(value)) return null;
  const { scenario, outcome, explanation, steps, payment, order } = value;
  if (
    typeof scenario !== "string" ||
    (outcome !== "completed" && outcome !== "scheduled") ||
    typeof explanation !== "string" ||
    !Array.isArray(steps) ||
    !isRecord(payment) ||
    !isRecord(order)
  ) {
    return null;
  }
  const parsedSteps = steps.map(parseStep);
  if (parsedSteps.some((step) => step === null)) return null;
  if (
    typeof payment.status !== "string" ||
    !PAYMENT_STATUSES.includes(payment.status as PaymentStatus) ||
    typeof order.id !== "number" ||
    typeof order.status !== "string" ||
    !ORDER_STATUSES.includes(order.status as OrderStatus)
  ) {
    return null;
  }
  return {
    scenario,
    outcome,
    explanation,
    steps: parsedSteps as SimulationStep[],
    payment: payment as unknown as DemoSimulation["payment"],
    order: { id: order.id, status: order.status as OrderStatus },
  };
}

// A payment the cases can still be run on.
export function canRunCases(status: PaymentStatus): boolean {
  return status === "pending" || status === "processing";
}
