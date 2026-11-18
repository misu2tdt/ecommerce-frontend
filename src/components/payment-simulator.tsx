"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { OrderStatusBadge } from "@/components/order-status";
import { PaymentStatusBadge } from "@/components/payment-status";
import { buttonStyles } from "@/components/ui/button";
import {
  checkDemoPaymentStatusAction,
  simulateDemoPaymentAction,
  type SimulatorState,
} from "@/features/payments/actions";
import {
  startDelayedWait,
  type DelayedWaitState,
} from "@/features/payments/delayed-wait";
import {
  SIMULATOR_SCENARIOS,
  canRunCases,
  stepResultLabel,
} from "@/lib/payment-simulator";

const INITIAL_STATE: SimulatorState = {};

// "Try a tricky case": four practice cases (a repeated confirmation, one that
// comes too late, a slow one and a tampered one). The page sends only the case;
// the backend builds and signs every event, runs it and answers with an
// explanation and the steps, which are shown as they come.
//
// The section sits in a disclosure and its buttons are drawn once it is opened,
// so the three buttons of the page stay the only choices a visitor sees at first.
export function PaymentSimulator({
  paymentId,
  orderId,
}: {
  paymentId: number;
  orderId: number;
}) {
  const ids = useId();
  const [state, action, pending] = useActionState(
    simulateDemoPaymentAction,
    INITIAL_STATE,
  );
  const [open, setOpen] = useState(false);
  const [wait, setWait] = useState<{
    stamp: number;
    state: DelayedWaitState;
  } | null>(null);
  // A second click before the first request shows as pending must not send a
  // second case.
  const locked = useRef(false);

  const { simulation, stamp } = state;
  const scheduled = simulation?.outcome === "scheduled";

  useEffect(() => {
    if (!pending) locked.current = false;
  }, [pending]);

  // The delayed case: one look after the event was due, stopped if the page goes
  // away or another run starts. Only the callback sets state.
  useEffect(() => {
    if (!scheduled || stamp === undefined) return;
    return startDelayedWait({
      check: () => checkDemoPaymentStatusAction(paymentId, orderId),
      onChange: (next) => setWait({ stamp, state: next }),
    });
  }, [scheduled, stamp, paymentId, orderId]);

  const waitState: DelayedWaitState | null = scheduled
    ? wait !== null && wait.stamp === stamp
      ? wait.state
      : { phase: "waiting" }
    : null;
  const snapshot =
    waitState && "snapshot" in waitState ? waitState.snapshot : null;
  const paymentStatus = snapshot?.payment ?? simulation?.payment.status;
  const orderStatus = snapshot?.order ?? simulation?.order.status;
  const waiting =
    waitState?.phase === "waiting" || waitState?.phase === "checking";
  const finished = paymentStatus !== undefined && !canRunCases(paymentStatus);
  const disabled = pending || waiting || finished;

  // The disclosure is left to the browser (no `open` prop), so a visitor who
  // opened it before the page was interactive is not shut again. This reads it
  // once when it is attached.
  const syncOpen = useCallback((node: HTMLDetailsElement | null) => {
    if (node?.open) setOpen(true);
  }, []);

  function guardDoubleClick(event: MouseEvent<HTMLButtonElement>) {
    if (locked.current) {
      event.preventDefault();
      return;
    }
    locked.current = true;
  }

  return (
    <div className="mt-8 border-t border-line pt-6">
      <details ref={syncOpen} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="flex min-h-11 cursor-pointer items-center text-body font-semibold text-brand focus-visible:outline-2 focus-visible:outline-brand">
          Try a tricky case
        </summary>

        {open && (
          <div className="mt-2">
            <p className="text-body-sm text-neutral-600">
              Each case sends practice payment messages the way a real payment
              company would, then shows what happened. Nothing real is charged.
            </p>

            <form action={action} className="mt-4">
              <input type="hidden" name="paymentId" value={paymentId} />
              <input type="hidden" name="orderId" value={orderId} />
              <ul className="grid gap-4">
                {SIMULATOR_SCENARIOS.map((choice) => (
                  <li key={choice.scenario}>
                    <button
                      type="submit"
                      name="scenario"
                      value={choice.scenario}
                      disabled={disabled}
                      aria-describedby={`${ids}-${choice.scenario}`}
                      onClick={guardDoubleClick}
                      className={buttonStyles({
                        variant: "secondary",
                        size: "lg",
                        className: "w-full",
                      })}
                    >
                      {choice.label}
                    </button>
                    <p
                      id={`${ids}-${choice.scenario}`}
                      className="mt-1.5 text-body-sm text-neutral-600"
                    >
                      {choice.description}
                    </p>
                  </li>
                ))}
              </ul>
            </form>

            {pending && (
              <p role="status" className="mt-4 text-body-sm text-neutral-600">
                Running the case...
              </p>
            )}
            {state.status === "error" && state.message && !pending && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-body-sm text-red-800"
              >
                {state.message}
              </p>
            )}
            {finished && !waiting && (
              <p role="status" className="mt-4 text-body-sm text-neutral-700">
                This payment is finished, so no more cases can be run on it.
              </p>
            )}

            {simulation && paymentStatus && orderStatus && (
              <section
                aria-labelledby={`${ids}-result`}
                data-simulator-result
                className="mt-6 rounded-md border border-line bg-surface-muted p-4 sm:p-5"
              >
                <h2
                  id={`${ids}-result`}
                  className="text-title font-bold text-brand-strong"
                >
                  What happened
                </h2>
                <p className="mt-2 text-body text-neutral-700">
                  {simulation.explanation}
                </p>

                <ol
                  aria-label="Steps"
                  className="mt-4 list-decimal space-y-4 pl-6 text-body-sm text-neutral-700 marker:font-semibold"
                >
                  {simulation.steps.map((step) => (
                    <li key={step.step}>
                      <p>
                        <span className="font-semibold text-brand-strong">
                          Sent:
                        </span>{" "}
                        {step.sent}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-brand-strong">
                          Result:
                        </span>{" "}
                        {stepResultLabel(step.result)} (HTTP {step.httpStatus})
                      </p>
                      <p className="mt-1 text-neutral-600">{step.detail}</p>
                    </li>
                  ))}
                </ol>

                {waitState && (
                  <DelayedNote state={waitState} />
                )}

                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-surface p-3">
                    <dt className="text-body-sm font-semibold text-neutral-700">
                      Payment status
                    </dt>
                    <dd className="mt-2">
                      <PaymentStatusBadge status={paymentStatus} size="md" />
                    </dd>
                  </div>
                  <div className="rounded-md bg-surface p-3">
                    <dt className="text-body-sm font-semibold text-neutral-700">
                      Order status
                    </dt>
                    <dd className="mt-2">
                      <OrderStatusBadge status={orderStatus} />
                    </dd>
                  </div>
                </dl>

                <Link
                  href={`/account/orders/${simulation.order.id}`}
                  className={buttonStyles({
                    variant: "secondary",
                    size: "md",
                    className: "mt-5",
                  })}
                >
                  View order
                </Link>
              </section>
            )}
          </div>
        )}
      </details>
    </div>
  );
}

// What the delayed case says while it waits and when the one look is done.
function DelayedNote({ state }: { state: DelayedWaitState }) {
  if (state.phase === "waiting" || state.phase === "checking") {
    return (
      <p
        role="status"
        className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-neutral-700"
      >
        Waiting for the delayed confirmation. It should arrive in about 10
        seconds.
      </p>
    );
  }
  if (state.phase === "arrived") {
    return (
      <p
        role="status"
        className="mt-4 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-body-sm text-success"
      >
        The delayed confirmation arrived. The statuses below are up to date.
      </p>
    );
  }
  if (state.phase === "still-processing") {
    return (
      <p
        role="status"
        className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900"
      >
        The delayed confirmation has not arrived. The demo may have lost it, for
        example if the demo service restarted. Nothing was charged. You can
        finish this payment with Pay now above.
      </p>
    );
  }
  return (
    <p
      role="status"
      className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900"
    >
      We could not check the payment just now. Refresh the page to see where it
      stands.
    </p>
  );
}
