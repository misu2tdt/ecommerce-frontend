import type { Page } from "@playwright/test";

// Shared by the design-system and demo payment specs: the same rule for every
// page, including the pages that need a live payment to open.

export const READABLE_PX = 14;
export const MIN_READABLE_SHARE = 0.95;

// Share of rendered, non-whitespace characters at or above READABLE_PX.
export async function measureReadableShare(page: Page) {
  return page.evaluate((readablePx) => {
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
    let total = 0;
    let readable = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || skip.has(element.tagName)) continue;
      const characters = (node.textContent ?? "").replace(/\s+/g, "").length;
      if (!characters || !element.checkVisibility({ visibilityProperty: true }))
        continue;
      total += characters;
      if (parseFloat(getComputedStyle(element).fontSize) >= readablePx)
        readable += characters;
    }
    return { total, readable };
  }, READABLE_PX);
}
