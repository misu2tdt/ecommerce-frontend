"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  FINISH_HOLD_MS,
  IDLE,
  NAVIGATION_START_EVENT,
  TICK_MS,
  isNewPage,
  locationKey,
  progressReducer,
  shouldStartForClick,
} from "@/lib/navigation-progress";

// A thin bar at the top of the window while a page change is under way, so a click
// is answered at once even when the next page takes a moment. Mounted once in the
// root layout. The rules (when it starts, shows, finishes, gives up) are in
// lib/navigation-progress.ts; this file connects them to clicks, the address and
// the clock.
export function NavigationProgress() {
  // useSearchParams needs a boundary, and nothing may wait for the bar.
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

// The address as the address bar has it.
function addressBarKey(): string {
  return locationKey(window.location.pathname, window.location.search);
}

function ProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const key = locationKey(pathname, search);

  const [state, dispatch] = useReducer(progressReducer, IDLE);
  const reducedMotion = usePrefersReducedMotion();

  // The new page is there when the address the app reports changes. Comparing in
  // render (and not in an effect) keeps the bar from lagging a frame behind.
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    dispatch({ type: "arrive" });
  }

  // The address bar's address of the page on screen, to tell a back or forward
  // step to another page from a step to a different part of the same page.
  const onScreen = useRef<string | null>(null);
  useEffect(() => {
    onScreen.current = addressBarKey();
  }, [key]);

  useEffect(() => {
    const start = () => dispatch({ type: "start", now: performance.now() });
    const here = () => ({
      origin: window.location.origin,
      key: addressBarKey(),
    });

    // Reached after React's own handler, which is where Next's Link takes the
    // click over and prevents the browser's navigation.
    function onClick(event: MouseEvent) {
      const anchor =
        event.target instanceof Element ? event.target.closest("a[href]") : null;
      const link = anchor instanceof HTMLAnchorElement ? anchor : null;
      const click = {
        href: link ? link.href : null,
        target: link ? link.getAttribute("target") : null,
        download: link ? link.hasAttribute("download") : false,
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        defaultPrevented: event.defaultPrevented,
      };
      if (shouldStartForClick(click, here())) start();
    }

    // Search, filters, sorting and the date range (see announceNavigation).
    function onAnnounced(event: Event) {
      const href = (event as CustomEvent<{ href?: unknown }>).detail?.href;
      if (typeof href === "string" && isNewPage(href, here())) start();
    }

    function onHistoryStep() {
      if (onScreen.current !== null && addressBarKey() !== onScreen.current) {
        start();
      }
    }

    window.addEventListener("click", onClick);
    window.addEventListener(NAVIGATION_START_EVENT, onAnnounced);
    window.addEventListener("popstate", onHistoryStep);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener(NAVIGATION_START_EVENT, onAnnounced);
      window.removeEventListener("popstate", onHistoryStep);
    };
  }, []);

  // While waiting: move the bar, show it once the wait is not instant, and give up
  // at the deadline. The interval exists only while a bar is waiting.
  const running = state.phase === "running";
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => dispatch({ type: "tick", now: performance.now() }),
      TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, [running]);

  // After the page arrived: hold the full bar for a moment, then remove it.
  const finishing = state.phase === "finishing";
  useEffect(() => {
    if (!finishing) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "settle" }),
      FINISH_HOLD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [finishing]);

  if (state.phase === "idle") return null;
  if (state.phase === "running" && !state.visible) return null;

  // With reduced motion the bar does not crawl: it is simply there, full width,
  // for as long as the page takes.
  const percent =
    reducedMotion || state.phase === "finishing" ? 100 : state.percent;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-[3px] overflow-hidden"
    >
      <div
        className="h-full origin-left bg-brand-soft transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${percent / 100})` }}
      />
    </div>
  );
}
