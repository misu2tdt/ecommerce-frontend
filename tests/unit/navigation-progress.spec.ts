import { expect, test } from "@playwright/test";
import {
  FALLBACK_MS,
  IDLE,
  SHOW_AFTER_MS,
  TICK_MS,
  announceNavigation,
  internalKey,
  isNewPage,
  locationKey,
  percentAt,
  progressReducer,
  shouldStartForClick,
  type ClickInfo,
  type Here,
  type ProgressEvent,
  type ProgressState,
} from "@/lib/navigation-progress";

function run(events: ProgressEvent[], from: ProgressState = IDLE): ProgressState {
  return events.reduce(progressReducer, from);
}

function running(state: ProgressState) {
  if (state.phase !== "running") throw new Error(`expected running, got ${state.phase}`);
  return state;
}

test.describe("navigation progress: how far the bar is", () => {
  test("it starts at nothing and grows with the wait", () => {
    expect(percentAt(0)).toBe(0);
    expect(percentAt(-5)).toBe(0);
    expect(percentAt(Number.NaN)).toBe(0);
    expect(percentAt(500)).toBeGreaterThan(0);
    expect(percentAt(1_000)).toBeGreaterThan(percentAt(500));
    expect(percentAt(3_000)).toBeGreaterThan(percentAt(1_000));
  });

  test("it slows down and never claims more than 90%", () => {
    const early = percentAt(1_000) - percentAt(0);
    const late = percentAt(11_000) - percentAt(10_000);
    expect(late).toBeLessThan(early);
    for (const wait of [5_000, 30_000, 600_000, Number.MAX_SAFE_INTEGER]) {
      expect(percentAt(wait)).toBeLessThanOrEqual(90);
    }
  });
});

test.describe("navigation progress: the states", () => {
  test("a click starts a hidden bar with a deadline", () => {
    const state = running(run([{ type: "start", now: 1_000 }]));
    expect(state.visible).toBe(false);
    expect(state.percent).toBe(0);
    expect(state.startedAt).toBe(1_000);
    expect(state.fallbackAt).toBe(1_000 + FALLBACK_MS);
  });

  test("a wait shorter than the show delay never shows a bar", () => {
    const waiting = run([{ type: "start", now: 0 }]);
    const early = progressReducer(waiting, { type: "tick", now: SHOW_AFTER_MS - 1 });
    // Nothing changed, so the very same state comes back (no re-render).
    expect(early).toBe(waiting);
    expect(progressReducer(early, { type: "arrive" })).toBe(IDLE);
  });

  test("after the show delay the bar appears and then only moves forward", () => {
    let state = run([{ type: "start", now: 0 }]);
    state = progressReducer(state, { type: "tick", now: SHOW_AFTER_MS });
    expect(running(state).visible).toBe(true);
    expect(running(state).percent).toBeGreaterThan(0);

    let last = running(state).percent;
    for (let now = SHOW_AFTER_MS + TICK_MS; now < 6_000; now += TICK_MS) {
      state = progressReducer(state, { type: "tick", now });
      const percent = running(state).percent;
      expect(percent).toBeGreaterThanOrEqual(last);
      expect(percent).toBeLessThanOrEqual(90);
      last = percent;
    }
  });

  test("when the page arrives a shown bar finishes, then goes away", () => {
    let state = run([
      { type: "start", now: 0 },
      { type: "tick", now: 600 },
    ]);
    state = progressReducer(state, { type: "arrive" });
    expect(state).toEqual({ phase: "finishing" });
    expect(progressReducer(state, { type: "settle" })).toBe(IDLE);
  });

  test("ticks, arrivals and settling do nothing when there is no bar", () => {
    expect(progressReducer(IDLE, { type: "tick", now: 5_000 })).toBe(IDLE);
    expect(progressReducer(IDLE, { type: "arrive" })).toBe(IDLE);
    expect(progressReducer(IDLE, { type: "settle" })).toBe(IDLE);
    const finishing: ProgressState = { phase: "finishing" };
    expect(progressReducer(finishing, { type: "tick", now: 5_000 })).toBe(finishing);
    expect(progressReducer(finishing, { type: "arrive" })).toBe(finishing);
    const waiting = run([{ type: "start", now: 0 }]);
    expect(progressReducer(waiting, { type: "settle" })).toBe(waiting);
  });

  test("a click while waiting keeps the bar where it is and renews the deadline", () => {
    let state = run([
      { type: "start", now: 0 },
      { type: "tick", now: 1_000 },
    ]);
    const before = running(state);
    state = progressReducer(state, { type: "start", now: 4_000 });
    const after = running(state);
    expect(after.startedAt).toBe(before.startedAt);
    expect(after.visible).toBe(true);
    expect(after.percent).toBe(before.percent);
    expect(after.fallbackAt).toBe(4_000 + FALLBACK_MS);
  });

  test("a click while the bar is finishing starts a fresh one", () => {
    const state = run(
      [{ type: "start", now: 9_000 }],
      { phase: "finishing" },
    );
    expect(running(state).startedAt).toBe(9_000);
    expect(running(state).visible).toBe(false);
  });
});

test.describe("navigation progress: it never stays stuck", () => {
  test("with no page ever arriving, the bar is gone by its deadline", () => {
    let state = run([{ type: "start", now: 0 }]);
    let shownAtSomePoint = false;
    let now = 0;
    while (state.phase === "running" && now < FALLBACK_MS * 3) {
      now += TICK_MS;
      state = progressReducer(state, { type: "tick", now });
      if (state.phase === "running" && state.visible) shownAtSomePoint = true;
    }
    expect(shownAtSomePoint).toBe(true);
    expect(state).toBe(IDLE);
    expect(now).toBeLessThanOrEqual(FALLBACK_MS + TICK_MS);
  });

  test("the deadline is not reached early", () => {
    const state = run([
      { type: "start", now: 0 },
      { type: "tick", now: FALLBACK_MS - 1 },
    ]);
    expect(state.phase).toBe("running");
    expect(progressReducer(state, { type: "tick", now: FALLBACK_MS })).toBe(IDLE);
  });

  test("a late tick after a long pause (a sleeping tab) ends the bar at once", () => {
    const state = run([
      { type: "start", now: 0 },
      { type: "tick", now: 500 },
      { type: "tick", now: 10 * 60_000 },
    ]);
    expect(state).toBe(IDLE);
  });

  test("a renewed deadline counts from the latest click", () => {
    let state = run([
      { type: "start", now: 0 },
      { type: "start", now: 7_000 },
    ]);
    state = progressReducer(state, { type: "tick", now: 9_000 });
    expect(state.phase).toBe("running");
    state = progressReducer(state, { type: "tick", now: 7_000 + FALLBACK_MS });
    expect(state).toBe(IDLE);
  });
});

test.describe("navigation progress: what counts as a page change", () => {
  const here: Here = { origin: "https://shop.test", key: "/products?page=2" };
  const link = (change: Partial<ClickInfo> = {}): ClickInfo => ({
    href: "https://shop.test/collections",
    target: null,
    download: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: true,
    ...change,
  });

  test("a plain click on an internal link to another page starts the bar", () => {
    expect(shouldStartForClick(link(), here)).toBe(true);
    expect(shouldStartForClick(link({ target: "_self" }), here)).toBe(true);
  });

  test("the same page with another query is a page change", () => {
    expect(
      shouldStartForClick(link({ href: "https://shop.test/products?page=3" }), here),
    ).toBe(true);
    expect(
      shouldStartForClick(link({ href: "https://shop.test/products" }), here),
    ).toBe(true);
  });

  test("the page the visitor is already on is not a page change", () => {
    expect(
      shouldStartForClick(link({ href: "https://shop.test/products?page=2" }), here),
    ).toBe(false);
  });

  test("a hash on the same page is not a page change", () => {
    expect(
      shouldStartForClick(
        link({ href: "https://shop.test/products?page=2#categories" }),
        here,
      ),
    ).toBe(false);
  });

  test("a click the browser handles itself is left alone", () => {
    // Next's Link prevents the browser's navigation; a plain anchor does not.
    expect(shouldStartForClick(link({ defaultPrevented: false }), here)).toBe(false);
  });

  test("new tabs, downloads, other buttons and modifier keys are not page changes", () => {
    expect(shouldStartForClick(link({ target: "_blank" }), here)).toBe(false);
    expect(shouldStartForClick(link({ download: true }), here)).toBe(false);
    expect(shouldStartForClick(link({ button: 1 }), here)).toBe(false);
    expect(shouldStartForClick(link({ button: 2 }), here)).toBe(false);
    expect(shouldStartForClick(link({ metaKey: true }), here)).toBe(false);
    expect(shouldStartForClick(link({ ctrlKey: true }), here)).toBe(false);
    expect(shouldStartForClick(link({ shiftKey: true }), here)).toBe(false);
    expect(shouldStartForClick(link({ altKey: true }), here)).toBe(false);
  });

  test("other sites, mail links and clicks outside any link are not page changes", () => {
    expect(
      shouldStartForClick(link({ href: "https://elsewhere.test/products" }), here),
    ).toBe(false);
    expect(
      shouldStartForClick(link({ href: "mailto:help@shop.test" }), here),
    ).toBe(false);
    expect(shouldStartForClick(link({ href: "tel:+84123456789" }), here)).toBe(false);
    expect(shouldStartForClick(link({ href: null }), here)).toBe(false);
  });

  test("internalKey keeps path and query, drops the hash, and refuses other sites", () => {
    expect(internalKey("/cart", "https://shop.test")).toBe("/cart");
    expect(internalKey("https://shop.test/a/b?x=1&y=2#top", "https://shop.test")).toBe(
      "/a/b?x=1&y=2",
    );
    expect(internalKey("https://shop.test:8443/a", "https://shop.test")).toBeNull();
    expect(internalKey("http://shop.test/a", "https://shop.test")).toBeNull();
    expect(internalKey("javascript:void(0)", "https://shop.test")).toBeNull();
    expect(internalKey("http://[bad", "https://shop.test")).toBeNull();
  });

  test("isNewPage resolves relative addresses against the site", () => {
    expect(isNewPage("/products?page=2", here)).toBe(false);
    expect(isNewPage("/products?page=4", here)).toBe(true);
    expect(isNewPage("/cart", here)).toBe(true);
    expect(isNewPage("https://elsewhere.test/cart", here)).toBe(false);
  });

  test("locationKey joins path and query the same way with or without the question mark", () => {
    expect(locationKey("/products", "")).toBe("/products");
    expect(locationKey("/products", "?")).toBe("/products");
    expect(locationKey("/products", "?q=tee")).toBe("/products?q=tee");
    expect(locationKey("/products", "q=tee")).toBe("/products?q=tee");
  });

  test("announcing a navigation is harmless where there is no window", () => {
    expect(() => announceNavigation("/products?q=tee")).not.toThrow();
  });
});
