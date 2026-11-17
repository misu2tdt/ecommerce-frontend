"use client";

import { useId, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import type { SectionState } from "@/features/analytics/use-analytics-section";

// One block of the analytics page: a heading, and whatever its own request is
// doing (loading, failed with a retry, or its content). Each block stands alone,
// so one failed request never blanks the page.
export function AnalyticsSection<T>({
  title,
  description,
  state,
  onRetry,
  skeleton,
  children,
}: {
  title: string;
  description?: string;
  state: SectionState<T>;
  onRetry: () => void;
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={state.status === "loading"}
      className="mt-8 min-w-0"
    >
      <h3 id={headingId} className="text-title font-bold text-brand-strong">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-3xl text-body-sm text-neutral-600">
          {description}
        </p>
      )}
      <div className="mt-4">
        {state.status === "loading" && (
          <div role="status">
            <span className="sr-only">Loading {title.toLowerCase()}</span>
            {skeleton}
          </div>
        )}
        {state.status === "error" && (
          <SectionError title={title} message={state.message} onRetry={onRetry} />
        )}
        {state.status === "ready" && children(state.data)}
      </div>
    </section>
  );
}

export function SectionError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-5 py-6"
    >
      <p className="font-semibold text-red-800">
        {title} could not be loaded
      </p>
      <p className="mt-1 text-body-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={buttonStyles({ variant: "secondary", size: "md", className: "mt-4" })}
      >
        Try again
      </button>
    </div>
  );
}

export function SectionEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface px-5 py-8 text-center">
      <p className="font-semibold text-brand-strong">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-body-sm text-neutral-600">
        {description}
      </p>
    </div>
  );
}

// Grey blocks that keep the place of the content while it loads.
export function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-neutral-200 ${className}`}
    />
  );
}
