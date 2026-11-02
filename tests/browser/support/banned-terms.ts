import type { Page } from "@playwright/test";

// Customer-facing copy must read like a shop, not like a code base. The word
// "demo" alone is allowed (the demo payment page and the About page are about
// the demo); only the phrase "demo data" is banned.
export const BANNED: Array<[string, RegExp]> = [
  ["integer", /\binteger\b/i],
  ["deterministic", /\bdeterministic\b/i],
  ["variant-level", /\bvariant-level\b/i],
  ["idempotent", /\bidempoten(t|cy)\b/i],
  ["NestJS", /\bNest\.?js\b/i],
  ["Next.js", /\bNext\.js\b/i],
  ["Postgres", /\bPostgres(QL)?\b/i],
  ["API", /\bAPI\b/],
  ["seed", /\bseed(s|ed|ing)?\b/i],
  ["endpoint", /\bendpoints?\b/i],
  ["payload", /\bpayloads?\b/i],
  ["session", /\bsessions?\b/i],
  ["token", /\btokens?\b/i],
  ["demo data", /\bdemo data\b/i],
  ["backend", /\bback-?end\b/i],
  ["server-side", /\bserver-?side\b/i],
  ["provider", /\bprovider\b/i],
  ["IPN", /\bIPN\b/],
  ["authoritative", /\bauthoritative\b/i],
  ["authenticated", /\bauthenticated\b/i],
  ["lifecycle", /\blifecycle\b/i],
  // Internal payment wording that must never reach a shopper.
  ["reconciliation", /\breconcil\w*/i],
];

// What a shopper (or a screen reader) gets from the page that is open now.
export async function pageText(page: Page) {
  return page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll("[aria-label]")).map(
      (node) => node.getAttribute("aria-label") ?? "",
    );
    const alts = Array.from(document.querySelectorAll("img")).map(
      (node) => node.getAttribute("alt") ?? "",
    );
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ??
      "";
    return [document.body.innerText, ...labels, ...alts, document.title, description].join(
      "\n",
    );
  });
}

export function findBannedTerms(text: string): string[] {
  return BANNED.filter(([, pattern]) => pattern.test(text)).map(
    ([name, pattern]) => {
      const at = text.match(pattern)?.index ?? 0;
      return `"${name}" in ...${text.slice(Math.max(0, at - 30), at + 40).replace(/\s+/g, " ")}...`;
    },
  );
}
