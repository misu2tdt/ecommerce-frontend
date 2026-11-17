"use client";

import { SectionEmpty, SkeletonBlock } from "@/components/analytics-section";
import { describeDays, kpisOf, type Change, type Kpi } from "@/lib/analytics";
import { formatCalendarDay } from "@/lib/dates";
import type { AnalyticsOverview } from "@/types/analytics";

function toneOf(kpi: Kpi): string {
  const { direction } = kpi.change;
  if (direction === "flat") return "text-neutral-600";
  // "New" (from nothing) is neither good nor bad on its own.
  if (direction === "new") return "text-neutral-700";
  const better = (direction === "up") !== kpi.lowerIsBetter;
  return better ? "text-success" : "text-red-700";
}

// The arrow is a picture; the words next to it carry the meaning.
function Arrow({ direction }: { direction: Change["direction"] }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 12"
      className="h-3 w-3 shrink-0 fill-current"
    >
      {direction === "up" && <path d="M6 1 11 10H1z" />}
      {direction === "down" && <path d="M6 11 1 2h10z" />}
      {direction === "flat" && <rect x="1" y="5" width="10" height="2" />}
      {direction === "new" && <path d="M5 1h2v4h4v2H7v4H5V7H1V5h4z" />}
    </svg>
  );
}

export function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }, (_, index) => (
        <SkeletonBlock key={index} className="h-36" />
      ))}
    </div>
  );
}

export function Kpis({ overview }: { overview: AnalyticsOverview }) {
  const kpis = kpisOf(overview);
  const previousRange = `${formatCalendarDay(overview.previousRange.from)} to ${formatCalendarDay(overview.previousRange.to)}`;
  const comparison = `Previous ${describeDays(overview.previousRange.days)}`;
  return (
    <>
      {overview.current.placedOrders === 0 && (
        <div className="mb-4">
          <SectionEmpty
            title="No orders in this period"
            description="Nobody placed an order on these days, so the figures below are zero."
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <article
            key={kpi.key}
            aria-label={kpi.label}
            className="min-w-0 rounded-md border border-line bg-surface p-5"
          >
            <p className="text-body-sm font-semibold text-neutral-600">
              {kpi.label}
            </p>
            <p
              data-kpi-value
              className="mt-2 break-words text-heading font-bold text-brand-strong"
            >
              {kpi.value}
            </p>
            <p
              data-kpi-change
              className={`mt-3 flex items-center gap-2 text-body-sm font-semibold ${toneOf(kpi)}`}
            >
              <Arrow direction={kpi.change.direction} />
              <span>{kpi.change.text}</span>
            </p>
            <p data-kpi-previous className="mt-1 text-body-sm text-neutral-600">
              {comparison}: {kpi.previous}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-body-sm text-neutral-600">
        Compared with {previousRange}. Revenue and paid orders count orders that
        are confirmed, processing, shipped or delivered, on the day they were
        placed. The cancelled rate is cancelled orders over all orders placed.
      </p>
    </>
  );
}
