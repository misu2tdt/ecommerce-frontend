"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { FeedbackState } from "@/components/feedback-state";
import { OrderStatusBadge } from "@/components/order-status";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
import {
  resolveReconciliationAction,
  type ResolveReconciliationState,
} from "@/features/reconciliation/actions";
import { formatDateTime } from "@/lib/dates";
import {
  RESOLUTION_NOTE_MAX,
  RESOLUTION_NOTE_MIN,
  formatEventAmount,
  formatResolver,
  isResolved,
  trimmedNoteLength,
  validateResolutionNote,
} from "@/lib/reconciliation";
import type {
  ReconciliationItem,
  ReconciliationStatusFilter,
} from "@/types/reconciliation";

const INITIAL_STATE: ResolveReconciliationState = {};

const EMPTY_STATES: Record<
  ReconciliationStatusFilter,
  { title: string; description: string }
> = {
  unresolved: {
    title: "Nothing to reconcile",
    description:
      "No payment events are waiting for an admin. An event appears here when a payment result could not be applied cleanly, for example a success that arrives after the order was cancelled.",
  },
  resolved: {
    title: "No resolved events",
    description: "Events that an admin has handled will be listed here.",
  },
  all: {
    title: "No payment events to show",
    description:
      "Events that need an admin, and the ones already handled, will be listed here.",
  },
};

// The table of events and the resolve dialog. The dialog belongs to this
// component (not to a row), so it stays open when the refreshed list no longer
// holds the row it was opened for.
export function ReconciliationQueue({
  items,
  status,
}: {
  items: ReconciliationItem[];
  status: ReconciliationStatusFilter;
}) {
  const [target, setTarget] = useState<ReconciliationItem | null>(null);
  // The table box below is "relative" on purpose: it is then the containing
  // block of the visually hidden "Actions" heading (sr-only is absolutely
  // positioned), which would otherwise sit outside the scrolling area and
  // widen the whole page on a phone.

  if (items.length === 0 && target === null) {
    const empty = EMPTY_STATES[status];
    return (
      <div className="mt-8">
        <FeedbackState title={empty.title} description={empty.description} />
      </div>
    );
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="mt-8">
          <FeedbackState
            title={EMPTY_STATES[status].title}
            description={EMPTY_STATES[status].description}
          />
        </div>
      ) : (
        <div className="relative mt-8 overflow-hidden rounded-md border border-line bg-surface">
          <div className="overflow-x-auto">
            <table
              aria-label="Payment events"
              className="min-w-full divide-y divide-line"
            >
              <thead className="bg-surface-muted">
                <tr>
                  {[
                    "Received",
                    "Order",
                    "Payment",
                    "Amount",
                    "Event",
                    "What happened",
                    "Resolution",
                    "",
                  ].map((heading, index) => (
                    <th
                      key={`${heading}-${index}`}
                      scope="col"
                      className="px-5 py-3 text-left text-caption font-semibold uppercase tracking-eyebrow text-neutral-600"
                    >
                      {heading || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((item) => (
                  <EventRow
                    key={item.id}
                    item={item}
                    onResolve={() => setTarget(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {target && (
        <ResolveDialog
          key={target.id}
          item={target}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}

function EventRow({
  item,
  onResolve,
}: {
  item: ReconciliationItem;
  onResolve: () => void;
}) {
  const resolved = isResolved(item);
  return (
    <tr>
      <td className="whitespace-nowrap px-5 py-4 text-body-sm text-neutral-600">
        {formatDateTime(item.createdAt)}
      </td>
      <td className="px-5 py-4">
        <Link
          href={`/admin/orders/${item.order.id}`}
          className="inline-flex min-h-11 items-center font-bold text-brand-strong underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          Order #{item.order.id}
        </Link>
        <div className="mt-1">
          <OrderStatusBadge status={item.order.status} audience="admin" />
        </div>
      </td>
      <td className="px-5 py-4 text-body-sm text-neutral-700">
        <p className="font-semibold text-brand-strong">
          Payment #{item.payment.id}
        </p>
        <p className="mt-1">{item.provider}</p>
        <p className="mt-1 max-w-56 break-all text-neutral-600">
          {item.providerPaymentId}
        </p>
        <Badge className="mt-2">{item.payment.status}</Badge>
      </td>
      <td className="whitespace-nowrap px-5 py-4 font-bold text-brand-strong">
        {formatEventAmount(item.payment.amount, item.payment.currency)}
      </td>
      <td className="px-5 py-4 text-body-sm text-neutral-700">
        <p className="font-semibold text-brand-strong">Event #{item.id}</p>
        <p className="mt-1">{item.eventType}</p>
      </td>
      <td className="px-5 py-4 text-body-sm text-neutral-700">
        {item.processingMessage && (
          <p className="max-w-72">{item.processingMessage}</p>
        )}
        <p className="mt-2 max-w-72 font-semibold text-neutral-800">
          {item.suggestedAction}
        </p>
      </td>
      <td className="px-5 py-4 text-body-sm text-neutral-700">
        {resolved ? (
          <>
            <Badge variant="success">Resolved</Badge>
            <p className="mt-2">
              {formatDateTime(item.resolvedAt!)} by{" "}
              {formatResolver(item.resolvedByUserId)}
            </p>
            {item.resolutionNote && (
              <p className="mt-1 max-w-72 whitespace-pre-wrap break-words text-neutral-600">
                {item.resolutionNote}
              </p>
            )}
          </>
        ) : (
          <Badge variant="warning">Unresolved</Badge>
        )}
      </td>
      <td className="px-5 py-4 text-right">
        {!resolved && (
          <button
            type="button"
            onClick={onResolve}
            aria-label={`Resolve event #${item.id}`}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Resolve
          </button>
        )}
      </td>
    </tr>
  );
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ResolveDialog({
  item,
  onClose,
}: {
  item: ReconciliationItem;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    resolveReconciliationAction,
    INITIAL_STATE,
  );
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Set at the first submit and cleared when the action has finished, so a
  // second click or Enter before the page has re-rendered sends nothing.
  const submitting = useRef(false);
  const pendingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const textId = useId();
  const noteId = useId();
  const helpId = useId();

  const done = state.status === "success";
  const check = validateResolutionNote(note);
  const length = trimmedNoteLength(note);
  const showNoteError = touched && !check.valid;
  const noteMessage =
    !check.valid && touched
      ? check.message
      : `${RESOLUTION_NOTE_MIN} to ${RESOLUTION_NOTE_MAX} characters, not counting spaces at the start and end.`;

  useEffect(() => {
    pendingRef.current = pending;
    if (!pending) submitting.current = false;
  }, [pending]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    noteRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!pendingRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable =
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (done) closeRef.current?.focus();
  }, [done]);

  function guardSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitting.current || pending || done || !check.valid) {
      event.preventDefault();
      setTouched(true);
      return;
    }
    submitting.current = true;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={textId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="fixed inset-0 bg-neutral-900/60"
        onClick={() => {
          if (!pending) onClose();
        }}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-surface p-6 shadow-2xl sm:p-8"
      >
        <h2 id={titleId} className="text-title font-bold text-brand-strong">
          Resolve event #{item.id}
        </h2>
        <div id={textId} className="mt-3 text-body-sm text-neutral-600">
          <p>
            Order #{item.order.id}, payment #{item.payment.id} (
            {item.eventType}).
          </p>
          <p className="mt-2 font-semibold text-neutral-800">
            {item.suggestedAction}
          </p>
          <p className="mt-3 rounded-md bg-surface-muted p-3 text-neutral-700">
            Resolving only records who handled this event, when, and your note.
            It does not change any order, payment or stock. Do the refund or
            the fulfilment first, outside this page.
          </p>
        </div>

        {done ? (
          <div className="mt-5">
            <p
              role="status"
              className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-body-sm text-success"
            >
              {state.message}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form action={formAction} onSubmit={guardSubmit} className="mt-5">
            <input type="hidden" name="eventId" value={item.id} />
            <label
              htmlFor={noteId}
              className="block text-body-sm font-semibold text-neutral-800"
            >
              Resolution note
            </label>
            <textarea
              id={noteId}
              ref={noteRef}
              name="note"
              rows={4}
              value={note}
              disabled={pending}
              aria-required="true"
              aria-invalid={showNoteError}
              aria-describedby={helpId}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="What was done, for example: Refunded manually in the provider portal"
              className={fieldStyles("mt-2")}
            />
            <p
              id={helpId}
              className={`mt-2 text-body-sm ${showNoteError ? "text-red-700" : "text-neutral-600"}`}
            >
              {noteMessage}{" "}
              <span>
                {length} / {RESOLUTION_NOTE_MAX}
              </span>
            </p>
            {state.status === "error" && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800"
              >
                {state.message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !check.valid}
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                {pending ? "Saving..." : "Record resolution"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
