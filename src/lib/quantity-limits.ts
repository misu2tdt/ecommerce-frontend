import { CART_LINES_MAX, QUANTITY_MAX_PER_LINE } from "./limits";

// What a shopper may put in the cart, decided before anything is sent: no more
// than the stock and no more than the backend's limit for one line. These are
// pure so the product page, the cart page and the tests use the same rules.

export interface QuantityCap {
  // The most that can be chosen for this variant (0 when it is out of stock).
  max: number;
  // What sets that maximum: the stock, or the limit for one line.
  limitedBy: "stock" | "line";
}

export const QUANTITY_LIMIT_MESSAGE = `You can buy up to ${QUANTITY_MAX_PER_LINE} of one item at a time.`;

export function quantityCap(stock: number): QuantityCap {
  const available = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  return available <= QUANTITY_MAX_PER_LINE
    ? { max: available, limitedBy: "stock" }
    : { max: QUANTITY_MAX_PER_LINE, limitedBy: "line" };
}

// Whether the quantity can go up by one, and if not, why (in words for the shopper).
export function canIncreaseQuantity(
  quantity: number,
  stock: number,
): { allowed: true } | { allowed: false; reason: string } {
  const cap = quantityCap(stock);
  if (quantity < cap.max) return { allowed: true };
  return {
    allowed: false,
    reason:
      cap.limitedBy === "line"
        ? QUANTITY_LIMIT_MESSAGE
        : "That is all we have in stock.",
  };
}

export const LINE_LIMIT_MESSAGE = `Your cart can hold at most ${CART_LINES_MAX} different products. Remove one to add another.`;

// Whether one more product (a new line) fits in a cart with `lineCount` lines.
export function canAddNewLine(lineCount: number): boolean {
  return lineCount < CART_LINES_MAX;
}
