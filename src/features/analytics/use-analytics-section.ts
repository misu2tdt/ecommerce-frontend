"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalyticsPayloads, AnalyticsSection } from "@/types/analytics";

export type SectionState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

const GENERIC_ERROR =
  "This section could not be loaded. Please try again shortly.";

async function fetchSection<S extends AnalyticsSection>(
  section: S,
  range: { from: string; to: string },
  signal: AbortSignal,
): Promise<AnalyticsPayloads[S]> {
  const query = new URLSearchParams({ from: range.from, to: range.to });
  const response = await fetch(
    `/api/admin/analytics/${section}?${query.toString()}`,
    { cache: "no-store", headers: { Accept: "application/json" }, signal },
  );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : GENERIC_ERROR;
    throw new Error(message);
  }
  return body as AnalyticsPayloads[S];
}

// Loads one section of the analytics page on its own: a failure here leaves the
// other sections alone, and `retry` asks again for this one only. The page is
// keyed by the range, so a new range starts from "loading" with a fresh hook.
export function useAnalyticsSection<S extends AnalyticsSection>(
  section: S,
  range: { from: string; to: string },
): { state: SectionState<AnalyticsPayloads[S]>; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SectionState<AnalyticsPayloads[S]>>({
    status: "loading",
  });
  const { from, to } = range;

  useEffect(() => {
    const controller = new AbortController();
    fetchSection(section, { from, to }, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            // A failed fetch (offline, blocked) is a TypeError with a browser
            // message nobody should read; the server's own messages are shown.
            error instanceof Error &&
            !(error instanceof TypeError) &&
            error.message
              ? error.message
              : GENERIC_ERROR,
        });
      },
    );
    return () => controller.abort();
  }, [section, from, to, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
