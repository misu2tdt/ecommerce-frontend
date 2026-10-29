// The backend words its errors for developers ("Variant … has insufficient
// stock", "Idempotency key is already in use"). The cart, checkout and payment
// screens show them to shoppers, so they are translated here for display only.
// Code that decides what to do (for example the stock-issue link at checkout)
// must keep reading the original message.

const UNAVAILABLE = "One of these items is no longer available.";
const PAYMENT_NOT_STARTED = "We could not start this payment. Please try again.";

const RULES: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [
    /^Variant (.+) has insufficient stock$/i,
    (match) => `There is not enough stock for ${match[1]}.`,
  ],
  [/^Variant (ID \d+ )?does not exist$/i, () => UNAVAILABLE],
  [/^Variant Product does not exist$/i, () => UNAVAILABLE],
  [/^Variant is inactive$/i, () => "This item is no longer available."],
  [
    /^Variant (.+) is inactive$/i,
    (match) => `${match[1]} is no longer available.`,
  ],
  [/^Product is inactive$/i, () => "This item is no longer available."],
  [
    /^Product (.+) is inactive$/i,
    (match) => `${match[1]} is no longer available.`,
  ],
  [/^Cannot (checkout|quote) an empty cart$/i, () => "Your cart is empty."],
  [/^Cart item not found$/i, () => "That item is no longer in your cart."],
  [
    /^Only a pending Order can be paid$/i,
    () => "Only an order that is waiting for payment can be paid.",
  ],
  [/^Order is already paid$/i, () => "This order is already paid."],
  [/^Idempotency[ -]key\b/i, () => PAYMENT_NOT_STARTED],
  [/^Payment provider identity mismatch$/i, () => PAYMENT_NOT_STARTED],
];

export function toShopperMessage(message: string): string {
  for (const [pattern, build] of RULES) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
