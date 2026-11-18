// The logic behind the thin bar at the top of the page that shows a page change
// is under way. It has no React or browser code in it, so it is tested on its own
// (tests/unit/navigation-progress.spec.ts); components/navigation-progress.tsx
// wires it to clicks, the address and the clock.
//
// The rules:
//  - It starts when the visitor clicks an internal link, goes back or forward, or
//    a component announces a navigation of its own (announceNavigation).
//  - It stays hidden for the first moments, so a page change that is instant
//    never flashes a bar.
//  - It crawls towards 90% and never reaches the end by itself.
//  - It finishes when the address of the page changes, i.e. the new page is there.
//  - It can never stay stuck: after FALLBACK_MS it goes away on its own.

// A page change faster than this shows no bar at all.
export const SHOW_AFTER_MS = 100;
// How long the bar stays full before it fades away.
export const FINISH_HOLD_MS = 250;
// The longest a bar may stay up without the address changing (a link to the page
// the visitor is already on, a redirect back, a click that did not navigate).
export const FALLBACK_MS = 8_000;
// How often the bar moves while it waits.
export const TICK_MS = 120;
// The bar never claims more than this until the page has really arrived.
const CRAWL_LIMIT = 90;
const CRAWL_SPEED_MS = 2_000;

export type ProgressState =
  | { phase: "idle" }
  | {
      phase: "running";
      startedAt: number;
      // The bar is dropped at this time even if the address never changed.
      fallbackAt: number;
      visible: boolean;
      percent: number;
    }
  | { phase: "finishing" };

export type ProgressEvent =
  | { type: "start"; now: number }
  | { type: "tick"; now: number }
  | { type: "arrive" }
  | { type: "settle" };

export const IDLE: ProgressState = { phase: "idle" };

// How far the bar is after waiting this long: fast at first, ever slower, never
// past 90%.
export function percentAt(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  const percent = CRAWL_LIMIT * (1 - Math.exp(-elapsedMs / CRAWL_SPEED_MS));
  return Math.min(CRAWL_LIMIT, Math.round(percent * 10) / 10);
}

export function progressReducer(
  state: ProgressState,
  event: ProgressEvent,
): ProgressState {
  switch (event.type) {
    case "start":
      if (state.phase === "running") {
        // A second click while waiting keeps the bar where it is and gives it a
        // fresh deadline.
        return { ...state, fallbackAt: event.now + FALLBACK_MS };
      }
      return {
        phase: "running",
        startedAt: event.now,
        fallbackAt: event.now + FALLBACK_MS,
        visible: false,
        percent: 0,
      };

    case "tick": {
      if (state.phase !== "running") return state;
      if (event.now >= state.fallbackAt) return IDLE;
      const elapsed = event.now - state.startedAt;
      const visible = elapsed >= SHOW_AFTER_MS;
      const percent = visible ? percentAt(elapsed) : 0;
      if (visible === state.visible && percent === state.percent) return state;
      return { ...state, visible, percent };
    }

    case "arrive":
      if (state.phase !== "running") return state;
      // Never shown: nothing to finish.
      return state.visible ? { phase: "finishing" } : IDLE;

    case "settle":
      return state.phase === "finishing" ? IDLE : state;
  }
}

// ---- what counts as a navigation ----------------------------------------------

export interface ClickInfo {
  // The anchor's resolved address (`anchor.href`), or null when there is no anchor.
  href: string | null;
  target: string | null;
  download: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  // Set by the time the click reaches the window: Next's Link prevents the
  // browser's own navigation when it takes the click over. A plain anchor that
  // the browser follows with a full page load is not tracked.
  defaultPrevented: boolean;
}

export interface Here {
  origin: string;
  // Path and query of the page now, as in the address bar.
  key: string;
}

// The path and query of an address on this site, or null for anything else
// (another site, mailto:, tel:, an address that is not valid).
export function internalKey(href: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.origin !== origin) return null;
  return `${url.pathname}${url.search}`;
}

// Whether going to `href` is a page change to show: an address on this site that
// is not the page the visitor is on. A hash on the same page is not one.
export function isNewPage(href: string, here: Here): boolean {
  const key = internalKey(href, here.origin);
  return key !== null && key !== here.key;
}

// Whether this click starts a page change.
export function shouldStartForClick(click: ClickInfo, here: Here): boolean {
  if (click.href === null) return false;
  if (!click.defaultPrevented) return false;
  if (click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
  if (click.download) return false;
  if (click.target && click.target !== "_self") return false;
  return isNewPage(click.href, here);
}

// ---- navigations that are not link clicks --------------------------------------

// Search, filters, sorting and the date range change the address with
// router.push. They tell the bar before they do, so it can start.
export const NAVIGATION_START_EVENT = "verve:navigation-start";

export function announceNavigation(href: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ href: string }>(NAVIGATION_START_EVENT, { detail: { href } }),
  );
}

// The key the bar compares to see that the address changed.
export function locationKey(pathname: string, search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}
