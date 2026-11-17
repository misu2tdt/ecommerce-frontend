import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { AnalyticsRangePicker } from "@/components/analytics-range-picker";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import {
  ANALYTICS_TIMEZONE,
  ANALYTICS_TIMEZONE_NOTE,
  describeDays,
  describeRange,
  parseRangeParams,
} from "@/lib/analytics";
import { todayInVietnam } from "@/lib/dates";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const today = todayInVietnam();
  // A range in the address that the backend would refuse is never sent: the
  // page shows the last 30 days and says why.
  const { range, problem } = parseRangeParams(
    { from: params.from, to: params.to },
    today,
  );

  return (
    <>
      <div>
        <Eyebrow>Insights</Eyebrow>
        <h2 className="mt-2 text-heading font-bold tracking-tight text-brand-strong">
          Analytics
        </h2>
        <p className="mt-3 max-w-3xl text-neutral-600">
          Revenue, orders, customers and best sellers for a range of days. The
          address keeps the range, so a link shows the same days to whoever
          opens it.
        </p>
      </div>

      <AnalyticsRangePicker range={range} today={today} />

      {problem && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-800"
        >
          {problem} Showing the last {range.days} days instead.
        </p>
      )}

      <p className="mt-5 text-body-sm text-neutral-700" data-range-summary>
        Showing <strong>{describeRange(range)}</strong> (
        {describeDays(range.days)}). Days are calendar days in{" "}
        <span data-timezone>{ANALYTICS_TIMEZONE}</span> ({ANALYTICS_TIMEZONE_NOTE}).
      </p>

      <AnalyticsDashboard
        key={`${range.from}_${range.to}`}
        range={{ from: range.from, to: range.to }}
      />
    </>
  );
}
