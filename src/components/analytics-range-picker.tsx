"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
import {
  ANALYTICS_PATH,
  PRESET_DAYS,
  activePreset,
  analyticsHref,
  lastDays,
  validateRange,
  type DateRange,
} from "@/lib/analytics";
import { announceNavigation } from "@/lib/navigation-progress";

// The range of the page: three presets (links, so each has an address) and a
// custom range checked here before anything is sent. The two date fields start
// from the range that is shown, and follow it when the address changes.
export function AnalyticsRangePicker({
  range,
  today,
}: {
  range: DateRange;
  today: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [error, setError] = useState<string | null>(null);
  // The range the fields were last set from. When the shown range changes (a
  // preset, a shared link, back and forward) the fields are set again, during
  // this render, so there is never a frame with the old dates.
  const [seen, setSeen] = useState(`${range.from}_${range.to}`);
  if (seen !== `${range.from}_${range.to}`) {
    setSeen(`${range.from}_${range.to}`);
    setFrom(range.from);
    setTo(range.to);
    setError(null);
  }
  const fromId = useId();
  const toId = useId();
  const errorId = useId();
  const preset = activePreset(range, today);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const check = validateRange(from, to, today);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setError(null);
    const href = analyticsHref(check.range);
    announceNavigation(href);
    router.push(href);
  }

  return (
    <div className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-5">
      <nav aria-label="Range presets" className="flex flex-wrap gap-2">
        {PRESET_DAYS.map((days) => {
          const current = preset === days;
          return (
            <Link
              key={days}
              href={analyticsHref(lastDays(days, today))}
              aria-current={current ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
                current
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-brand hover:bg-brand-soft"
              }`}
            >
              Last {days} days
            </Link>
          );
        })}
      </nav>

      <form
        action={ANALYTICS_PATH}
        method="get"
        noValidate
        onSubmit={submit}
        aria-label="Custom range"
        className="min-w-0"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor={fromId}
              className="block text-body-sm font-semibold text-neutral-800"
            >
              From
            </label>
            <input
              id={fromId}
              name="from"
              type="date"
              value={from}
              min="2000-01-01"
              max={today}
              required
              aria-invalid={error !== null}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => setFrom(event.target.value)}
              className={fieldStyles("mt-1")}
            />
          </div>
          <div>
            <label
              htmlFor={toId}
              className="block text-body-sm font-semibold text-neutral-800"
            >
              To
            </label>
            <input
              id={toId}
              name="to"
              type="date"
              value={to}
              min="2000-01-01"
              max={today}
              required
              aria-invalid={error !== null}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => setTo(event.target.value)}
              className={fieldStyles("mt-1")}
            />
          </div>
          <button
            type="submit"
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Apply range
          </button>
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-3 text-body-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
