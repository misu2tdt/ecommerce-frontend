import type { NextRequest } from "next/server";
import { getAnalyticsSection } from "@/features/analytics/api";
import { ApiError, apiErrorMessage } from "@/lib/api";
import { isAnalyticsSection, validateRange } from "@/lib/analytics";
import { todayInVietnam } from "@/lib/dates";

// The analytics page loads each of its sections from the browser, so that one
// section that fails can say so and be retried without the rest of the page.
// The sign-in cookie never leaves the server: this handler reads it, asks the
// backend (which only answers an ADMIN) and passes the answer on.

const NO_STORE = { "Cache-Control": "no-store" };

function problem(message: string, status: number) {
  return Response.json({ message }, { status, headers: NO_STORE });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ section: string }> },
) {
  const { section } = await context.params;
  if (!isAnalyticsSection(section)) {
    return problem("Unknown analytics section.", 404);
  }

  const query = request.nextUrl.searchParams;
  const from = query.getAll("from");
  const to = query.getAll("to");
  if (from.length !== 1 || to.length !== 1) {
    return problem("Send one start date and one end date.", 400);
  }
  const check = validateRange(from[0], to[0], todayInVietnam());
  if (!check.ok) return problem(check.message, 400);

  try {
    const payload = await getAnalyticsSection(section, check.range);
    return Response.json(payload, { headers: NO_STORE });
  } catch (error) {
    const status =
      error instanceof ApiError && error.status >= 400 && error.status < 600
        ? error.status
        : 503;
    return problem(apiErrorMessage(error), status);
  }
}
