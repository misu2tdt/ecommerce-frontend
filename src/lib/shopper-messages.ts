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
    /^Payment not found$/i,
    () => "We could not find this payment in your account.",
  ],
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

// The same idea for the staff screens of collections: the backend's wording for
// a duplicate address, products that no longer exist and the like, in plain
// sentences that say what to do next. The backend joins several validation
// messages with a space, so a rule matches anywhere in the text and the first
// rule that matches wins. Anything unknown is shown as the backend wrote it.
const COLLECTION_RULES: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [
    /A collection with the slug '([^']+)' already exists/i,
    (match) =>
      `Another collection already uses the address "${match[1]}". Choose a different name or address.`,
  ],
  [
    /These product ids do not exist: ([\d, ]+)/i,
    (match) =>
      `Some of the chosen products no longer exist (ids ${match[1].trim()}). Reload the page, pick the products again and save.`,
  ],
  [
    /One of the products no longer exists/i,
    () => "One of the chosen products no longer exists. Reload the page, pick the products again and save.",
  ],
  [
    /productIds must not contain duplicates/i,
    () => "A product appears more than once in the list. Remove the repeat and save again.",
  ],
  [
    /productIds must not hold more than (\d+) products/i,
    (match) => `A collection can hold at most ${match[1]} products.`,
  ],
  [
    /slug may only contain/i,
    () =>
      "The address may only contain lowercase letters and numbers joined by single dashes, for example summer-picks.",
  ],
  [
    /name must be between (\d+) and (\d+) characters/i,
    (match) => `Name must be between ${match[1]} and ${match[2]} characters.`,
  ],
  [
    /heroImageUrl must be a valid/i,
    () => "The cover image must be a full http or https address.",
  ],
  [
    /^Collection not found$/i,
    () => "This collection no longer exists. Go back to the list and refresh it.",
  ],
];

export function toCollectionAdminMessage(message: string): string {
  for (const [pattern, build] of COLLECTION_RULES) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
