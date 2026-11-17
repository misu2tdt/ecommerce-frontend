import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import { analyticsQuery, defaultRange } from "@/lib/analytics";
import { todayInVietnam } from "@/lib/dates";
import type {
  AnalyticsOverview,
  AnalyticsPayloads,
  AnalyticsSection,
} from "@/types/analytics";

// GET /admin/analytics/{section}: ADMIN only. The range is already checked
// (lib/analytics validateRange); the time zone is always Asia/Ho_Chi_Minh.
export function getAnalyticsSection<S extends AnalyticsSection>(
  section: S,
  range: { from: string; to: string },
): Promise<AnalyticsPayloads[S]> {
  return authenticatedApiFetch<AnalyticsPayloads[S]>(
    `/admin/analytics/${section}`,
    { query: analyticsQuery(section, range) },
  );
}

// The last 30 days, for the card on the admin dashboard.
export function getDefaultAnalyticsOverview(): Promise<AnalyticsOverview> {
  return getAnalyticsSection("overview", defaultRange(todayInVietnam()));
}
