import type { PaymentSnapshot, PaymentStatus } from "@/types/payment";

// The "delayed success" case: the backend answers at once and delivers the
// payment event about 10 seconds later, from a timer in its memory. The page
// looks once, a little after that, and never again: no polling.

// A little more than the 10 seconds the backend holds the event back.
export const DELAYED_CHECK_AFTER_MS = 12_000;

export type DelayedWaitState =
  // before the check: the event has not been due yet, or just about
  | { phase: "waiting" }
  // the one look at the payment is under way
  | { phase: "checking" }
  // the event arrived: the payment and the order as they are now
  | { phase: "arrived"; snapshot: PaymentSnapshot }
  // the payment is still waiting: the event may have been lost (the backend
  // restarted), and the normal buttons are the way out
  | { phase: "still-processing"; snapshot: PaymentSnapshot }
  // the look itself failed (network, session): nothing is known
  | { phase: "check-failed" };

export interface DelayedWaitTimers {
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

const realTimers: DelayedWaitTimers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function isWaiting(status: PaymentStatus): boolean {
  return status === "pending" || status === "processing";
}

// What the one look found.
export function settleDelayedWait(snapshot: PaymentSnapshot): DelayedWaitState {
  return isWaiting(snapshot.payment)
    ? { phase: "still-processing", snapshot }
    : { phase: "arrived", snapshot };
}

// Starts the wait and returns the function that stops it. `onChange` is called
// with "checking" when the timer fires, then once with the result. Stopping (the
// component went away, or a new run started) clears the timer and drops an
// answer that is still on its way, so nothing updates a page that left.
export function startDelayedWait({
  check,
  onChange,
  delayMs = DELAYED_CHECK_AFTER_MS,
  timers = realTimers,
}: {
  check: () => Promise<PaymentSnapshot>;
  onChange: (state: DelayedWaitState) => void;
  delayMs?: number;
  timers?: DelayedWaitTimers;
}): () => void {
  let stopped = false;

  const handle = timers.setTimeout(() => {
    if (stopped) return;
    onChange({ phase: "checking" });
    check().then(
      (snapshot) => {
        if (!stopped) onChange(settleDelayedWait(snapshot));
      },
      () => {
        if (!stopped) onChange({ phase: "check-failed" });
      },
    );
  }, delayMs);

  return () => {
    stopped = true;
    timers.clearTimeout(handle);
  };
}
