import { expect, test } from "@playwright/test";
import {
  DELAYED_CHECK_AFTER_MS,
  settleDelayedWait,
  startDelayedWait,
  type DelayedWaitState,
  type DelayedWaitTimers,
} from "@/features/payments/delayed-wait";
import {
  SIMULATOR_SCENARIOS,
  canRunCases,
  parseSimulation,
  parseSimulatorScenario,
  stepResultLabel,
} from "@/lib/payment-simulator";
import { toSimulatorMessage } from "@/lib/shopper-messages";
import type { PaymentSnapshot } from "@/types/payment";
import { findBannedTerms } from "../browser/support/banned-terms";

// ---- the choices ---------------------------------------------------------------

test.describe("the four tricky cases", () => {
  test("are the four the backend adds, each with a label and a one-line description", () => {
    expect(SIMULATOR_SCENARIOS.map((choice) => choice.scenario)).toEqual([
      "success_twice",
      "success_after_expiry",
      "delayed_success",
      "invalid_signature",
    ]);
    expect(SIMULATOR_SCENARIOS.map((choice) => choice.label)).toEqual([
      "Send success twice",
      "Success after the order expired",
      "Delayed success, arrives in 10 s",
      "Tampered signature",
    ]);
    for (const choice of SIMULATOR_SCENARIOS) {
      expect(choice.description.length, choice.scenario).toBeGreaterThan(20);
      // One line: a single sentence or two short ones, no line breaks.
      expect(choice.description, choice.scenario).not.toMatch(/\n/);
    }
  });

  test("use shopper language: none of the words the copy guard bans", () => {
    for (const choice of SIMULATOR_SCENARIOS) {
      expect(
        findBannedTerms(`${choice.label}. ${choice.description}`),
        choice.scenario,
      ).toEqual([]);
    }
  });

  test("a scenario is read only when it is one of the four (the page's three buttons keep their own route)", () => {
    for (const scenario of [
      "success_twice",
      "success_after_expiry",
      "delayed_success",
      "invalid_signature",
    ]) {
      expect(parseSimulatorScenario(scenario)).toBe(scenario);
    }
    for (const other of [
      "success",
      "declined",
      "cancelled",
      "",
      "SUCCESS_TWICE",
      "success_twice ",
      "__proto__",
      null,
    ]) {
      expect(parseSimulatorScenario(other), String(other)).toBeNull();
    }
  });
});

// ---- result codes --------------------------------------------------------------

test.describe("stepResultLabel", () => {
  test("gives each code of the backend a short, readable label", () => {
    expect(stepResultLabel("applied")).toBe("Applied");
    expect(stepResultLabel("already_applied")).toBe("Already up to date");
    expect(stepResultLabel("duplicate")).toBe("Ignored: seen before");
    expect(stepResultLabel("recorded_for_review")).toBe("Held for review");
    expect(stepResultLabel("rejected_invalid_signature")).toBe(
      "Rejected: signature does not match",
    );
    expect(stepResultLabel("expiry_forced")).toBe("Order expired now");
    expect(stepResultLabel("scheduled")).toBe("Scheduled for later");
  });

  test("labels are short, have no underscores and use shopper language", () => {
    for (const code of [
      "applied",
      "already_applied",
      "duplicate",
      "recorded_for_review",
      "rejected_invalid_signature",
      "expiry_forced",
      "scheduled",
    ]) {
      const label = stepResultLabel(code);
      expect(label.length, code).toBeLessThanOrEqual(40);
      expect(label, code).not.toContain("_");
      expect(findBannedTerms(label), code).toEqual([]);
    }
  });

  test("a code this page does not know reads calmly instead of showing the code", () => {
    expect(stepResultLabel("something_new")).toBe("Processed");
    expect(stepResultLabel("")).toBe("Processed");
    // Names every object has are not result codes either.
    for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(stepResultLabel(name), name).toBe("Processed");
    }
  });
});

// ---- the answer of the backend ---------------------------------------------------

const PAYMENT = {
  id: 7,
  provider: "demo",
  amount: 120000,
  currency: "VND",
  status: "succeeded",
  createdAt: "2026-11-18T01:00:00.000Z",
  updatedAt: "2026-11-18T01:00:01.000Z",
  succeededAt: "2026-11-18T01:00:01.000Z",
};

function answer(overrides: Record<string, unknown> = {}) {
  return {
    scenario: "success_twice",
    outcome: "completed",
    explanation: "The same signed success event is delivered twice.",
    steps: [
      {
        step: 1,
        sent: "a signed success event",
        result: "applied",
        httpStatus: 200,
        detail: "The payment changed.",
      },
      {
        step: 2,
        sent: "the same signed success event again (a retry)",
        result: "duplicate",
        httpStatus: 200,
        detail: "Seen before.",
      },
    ],
    payment: PAYMENT,
    order: { id: 12, status: "confirmed" },
    ...overrides,
  };
}

test.describe("parseSimulation", () => {
  test("accepts the answer of the backend and keeps the text as it came", () => {
    const parsed = parseSimulation(answer());
    expect(parsed).not.toBeNull();
    expect(parsed!.explanation).toBe(
      "The same signed success event is delivered twice.",
    );
    expect(parsed!.steps.map((step) => step.result)).toEqual([
      "applied",
      "duplicate",
    ]);
    expect(parsed!.steps[1].sent).toBe(
      "the same signed success event again (a retry)",
    );
    expect(parsed!.order).toEqual({ id: 12, status: "confirmed" });
    expect(parsed!.payment.status).toBe("succeeded");
  });

  test("accepts a scheduled answer whose payment is still processing", () => {
    const parsed = parseSimulation(
      answer({
        scenario: "delayed_success",
        outcome: "scheduled",
        steps: [
          {
            step: 1,
            sent: "a signed success event, to be delivered in 10 seconds",
            result: "scheduled",
            httpStatus: 202,
            detail: "Nothing has changed yet.",
          },
        ],
        payment: { ...PAYMENT, status: "processing", succeededAt: null },
        order: { id: 12, status: "pending" },
      }),
    );
    expect(parsed?.outcome).toBe("scheduled");
    expect(parsed?.payment.status).toBe("processing");
  });

  test("accepts a step code and extra fields it does not know", () => {
    const parsed = parseSimulation(
      answer({
        extra: true,
        steps: [
          {
            step: 1,
            sent: "something",
            result: "a_new_code",
            httpStatus: 200,
            detail: "x",
          },
        ],
      }),
    );
    expect(parsed?.steps[0].result).toBe("a_new_code");
  });

  test("refuses anything that is not the shape the page shows", () => {
    const bad: unknown[] = [
      null,
      undefined,
      "text",
      [],
      {},
      answer({ outcome: "done" }),
      answer({ explanation: 5 }),
      answer({ steps: "none" }),
      answer({ steps: [{ step: 1 }] }),
      answer({
        steps: [{ step: "1", sent: "a", result: "applied", httpStatus: 200, detail: "" }],
      }),
      answer({ payment: null }),
      answer({ payment: { ...PAYMENT, status: "paid" } }),
      answer({ order: { id: "12", status: "confirmed" } }),
      answer({ order: { id: 12, status: "paid" } }),
      answer({ order: null }),
    ];
    for (const value of bad) {
      expect(parseSimulation(value), JSON.stringify(value)).toBeNull();
    }
  });

  test("accepts an empty list of steps (nothing is invented for it)", () => {
    expect(parseSimulation(answer({ steps: [] }))?.steps).toEqual([]);
  });
});

test.describe("canRunCases", () => {
  test("is true only while the payment is waiting for a result", () => {
    expect(canRunCases("pending")).toBe(true);
    expect(canRunCases("processing")).toBe(true);
    for (const status of ["succeeded", "failed", "cancelled"] as const) {
      expect(canRunCases(status), status).toBe(false);
    }
  });
});

// ---- the refusals ---------------------------------------------------------------

test.describe("toSimulatorMessage", () => {
  test("404, 429, 400 and a lost connection each get one short sentence", () => {
    expect(toSimulatorMessage(404, "Payment not found")).toBe(
      "We could not find this payment, or tricky cases are not available for it.",
    );
    expect(toSimulatorMessage(429, "ThrottlerException: Too Many Requests")).toBe(
      "That was a lot of tries in a short time. Please wait a minute and try again.",
    );
    expect(toSimulatorMessage(400, "scenario must be one of the following values")).toBe(
      "We could not run that case. Please try again.",
    );
    expect(toSimulatorMessage(0, "Service is temporarily unavailable.")).toBe(
      "Payments are unavailable right now. Please try again.",
    );
    expect(toSimulatorMessage(500, "boom")).toBe(
      "We could not run that case. Please try again.",
    );
  });

  test("a 409 says which rule refused, in the words of the page", () => {
    expect(
      toSimulatorMessage(
        409,
        "This payment is already finished, so a scenario cannot be run on it. Start a new payment for the order (if it is still unpaid) and try again.",
      ),
    ).toBe(
      "This payment is already finished, so no more cases can be run on it. Start a new payment from your order to try another.",
    );
    expect(
      toSimulatorMessage(
        409,
        "This scenario only works while the order is still waiting for payment.",
      ),
    ).toBe("This case only works while the order is still waiting for payment.");
    expect(
      toSimulatorMessage(
        409,
        "This scenario only works on a payment started in the last 15 minutes. Start a new payment for the order and try again.",
      ),
    ).toBe(
      "This case only works on a payment started in the last 15 minutes. Start a new payment from your order and try again.",
    );
    expect(
      toSimulatorMessage(
        409,
        "The reconciliation queue already holds 12 unresolved events (12 or more pauses this scenario), so it is paused. Ask an admin to resolve some, or try another scenario.",
      ),
    ).toBe("This case is paused for the moment. Try another one.");
    expect(
      toSimulatorMessage(409, "The order changed while the scenario was starting."),
    ).toBe(
      "This case cannot run right now. Try another one, or start a new payment from your order.",
    );
  });

  test("never passes the backend's wording on, and uses shopper language", () => {
    const messages = [
      ...[400, 404, 409, 429, 500, 0].map((status) =>
        toSimulatorMessage(status, "The reconciliation queue is an API endpoint"),
      ),
      toSimulatorMessage(
        409,
        "The reconciliation queue already holds 12 unresolved events, so it is paused.",
      ),
    ];
    for (const message of messages) {
      expect(findBannedTerms(message), message).toEqual([]);
      expect(message).not.toMatch(/scenario|queue|reconcil/i);
    }
  });
});

// ---- the delayed case ------------------------------------------------------------

// A clock of its own: timers only fire when the test moves it forward.
class FakeClock implements DelayedWaitTimers {
  now = 0;
  private nextId = 1;
  private pending = new Map<number, { at: number; run: () => void }>();

  setTimeout = (callback: () => void, ms: number): unknown => {
    const id = this.nextId++;
    this.pending.set(id, { at: this.now + ms, run: callback });
    return id;
  };

  clearTimeout = (handle: unknown): void => {
    this.pending.delete(handle as number);
  };

  get scheduled() {
    return this.pending.size;
  }

  advance(ms: number) {
    const until = this.now + ms;
    for (;;) {
      const due = [...this.pending.entries()]
        .filter(([, timer]) => timer.at <= until)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.now = due[1].at;
      this.pending.delete(due[0]);
      due[1].run();
    }
    this.now = until;
  }
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const PROCESSING: PaymentSnapshot = { payment: "processing", order: "pending" };
const PAID: PaymentSnapshot = { payment: "succeeded", order: "confirmed" };

function watch(
  clock: FakeClock,
  check: () => Promise<PaymentSnapshot>,
  options: { delayMs?: number } = {},
) {
  const states: DelayedWaitState[] = [];
  const stop = startDelayedWait({
    check,
    onChange: (state) => states.push(state),
    timers: clock,
    ...options,
  });
  return { states, stop };
}

test.describe("the delayed case: one look, a little after the event is due", () => {
  test("looks after 12 seconds, which is later than the 10 the backend waits", () => {
    expect(DELAYED_CHECK_AFTER_MS).toBe(12_000);
    expect(DELAYED_CHECK_AFTER_MS).toBeGreaterThan(10_000);
  });

  test("does nothing before the time, then checks once and reports the arrival", async () => {
    const clock = new FakeClock();
    let calls = 0;
    const { states } = watch(clock, async () => {
      calls += 1;
      return PAID;
    });

    clock.advance(11_999);
    await flush();
    expect(calls).toBe(0);
    expect(states).toEqual([]);

    clock.advance(1);
    expect(states).toEqual([{ phase: "checking" }]);
    await flush();
    expect(calls).toBe(1);
    expect(states).toEqual([
      { phase: "checking" },
      { phase: "arrived", snapshot: PAID },
    ]);
  });

  test("never polls: nothing more happens however long the page stays open", async () => {
    const clock = new FakeClock();
    let calls = 0;
    const { states } = watch(clock, async () => {
      calls += 1;
      return PROCESSING;
    });

    clock.advance(DELAYED_CHECK_AFTER_MS);
    await flush();
    const afterFirstLook = states.length;
    clock.advance(10 * 60_000);
    await flush();

    expect(calls).toBe(1);
    expect(states).toHaveLength(afterFirstLook);
    expect(clock.scheduled).toBe(0);
  });

  test("a payment that is still processing gets the calm 'may have been lost' state", async () => {
    const clock = new FakeClock();
    const { states } = watch(clock, async () => PROCESSING);
    clock.advance(DELAYED_CHECK_AFTER_MS);
    await flush();
    expect(states.at(-1)).toEqual({
      phase: "still-processing",
      snapshot: PROCESSING,
    });
  });

  test("a failed look says nothing is known, and does not retry", async () => {
    const clock = new FakeClock();
    let calls = 0;
    const { states } = watch(clock, async () => {
      calls += 1;
      throw new Error("network");
    });
    clock.advance(DELAYED_CHECK_AFTER_MS);
    await flush();
    clock.advance(60_000);
    await flush();
    expect(states.at(-1)).toEqual({ phase: "check-failed" });
    expect(calls).toBe(1);
  });

  test("stopping before the time clears the timer: no look is made", async () => {
    const clock = new FakeClock();
    let calls = 0;
    const { states, stop } = watch(clock, async () => {
      calls += 1;
      return PAID;
    });
    expect(clock.scheduled).toBe(1);
    stop();
    expect(clock.scheduled).toBe(0);
    clock.advance(60_000);
    await flush();
    expect(calls).toBe(0);
    expect(states).toEqual([]);
  });

  test("stopping while the look is on its way drops its answer", async () => {
    const clock = new FakeClock();
    let release!: (snapshot: PaymentSnapshot) => void;
    const { states, stop } = watch(
      clock,
      () => new Promise<PaymentSnapshot>((resolve) => (release = resolve)),
    );
    clock.advance(DELAYED_CHECK_AFTER_MS);
    expect(states).toEqual([{ phase: "checking" }]);

    stop();
    release(PAID);
    await flush();
    expect(states).toEqual([{ phase: "checking" }]);
  });

  test("stopping twice is harmless, and stopping after the end changes nothing", async () => {
    const clock = new FakeClock();
    const { states, stop } = watch(clock, async () => PAID);
    clock.advance(DELAYED_CHECK_AFTER_MS);
    await flush();
    const before = [...states];
    stop();
    stop();
    expect(states).toEqual(before);
  });

  test("a delay of its own can be given", async () => {
    const clock = new FakeClock();
    const { states } = watch(clock, async () => PAID, { delayMs: 500 });
    clock.advance(499);
    expect(states).toEqual([]);
    clock.advance(1);
    expect(states).toEqual([{ phase: "checking" }]);
    await flush();
  });
});

test.describe("settleDelayedWait", () => {
  test("a payment that is waiting is 'still processing'; one with a result has 'arrived'", () => {
    for (const payment of ["pending", "processing"] as const) {
      expect(settleDelayedWait({ payment, order: "pending" }).phase, payment).toBe(
        "still-processing",
      );
    }
    for (const payment of ["succeeded", "failed", "cancelled"] as const) {
      expect(settleDelayedWait({ payment, order: "pending" }).phase, payment).toBe(
        "arrived",
      );
    }
  });

  test("keeps the statuses it found", () => {
    expect(settleDelayedWait(PAID)).toEqual({ phase: "arrived", snapshot: PAID });
  });
});
