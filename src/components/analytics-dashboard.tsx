"use client";

import { AnalyticsSection } from "@/components/analytics-section";
import { KpiSkeleton, Kpis } from "@/components/analytics-kpis";
import {
  RevenueChart,
  RevenueChartSkeleton,
} from "@/components/analytics-revenue-chart";
import {
  StatusBreakdown,
  StatusSkeleton,
} from "@/components/analytics-status-breakdown";
import {
  TopSellers,
  TopSellersSkeleton,
} from "@/components/analytics-top-sellers";
import { useAnalyticsSection } from "@/features/analytics/use-analytics-section";

// The four sections of the page, each with its own request. The page keys this
// component by the range, so a new range starts every section from loading.
export function AnalyticsDashboard({
  range,
}: {
  range: { from: string; to: string };
}) {
  const overview = useAnalyticsSection("overview", range);
  const revenue = useAnalyticsSection("revenue-by-day", range);
  const statuses = useAnalyticsSection("orders-by-status", range);
  const top = useAnalyticsSection("top-products", range);

  return (
    <>
      <AnalyticsSection
        title="Key figures"
        description="Each figure is compared with the previous period of the same length."
        state={overview.state}
        onRetry={overview.retry}
        skeleton={<KpiSkeleton />}
      >
        {(data) => <Kpis overview={data} />}
      </AnalyticsSection>

      <AnalyticsSection
        title="Revenue by day"
        state={revenue.state}
        onRetry={revenue.retry}
        skeleton={<RevenueChartSkeleton />}
      >
        {(data) => <RevenueChart data={data} />}
      </AnalyticsSection>

      <AnalyticsSection
        title="Orders by status"
        description="Every order placed in the period, by where it is now."
        state={statuses.state}
        onRetry={statuses.retry}
        skeleton={<StatusSkeleton />}
      >
        {(data) => <StatusBreakdown data={data} />}
      </AnalyticsSection>

      <AnalyticsSection
        title="Best sellers"
        state={top.state}
        onRetry={top.retry}
        skeleton={<TopSellersSkeleton />}
      >
        {(data) => <TopSellers data={data} />}
      </AnalyticsSection>
    </>
  );
}
