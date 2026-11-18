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
  // The limits of one cart line and of one cart (and the same for an order).
  // Their numbers come from the message, so the wording follows the backend.
  [
    /^A cart line holds at most (\d+) units$/i,
    (match) => `You can buy up to ${match[1]} of one item at a time.`,
  ],
  [
    /^A cart holds at most (\d+) different products$/i,
    (match) =>
      `Your cart can hold at most ${match[1]} different products. Remove one to add another.`,
  ],
  [
    /^An order holds at most (\d+) units of one product$/i,
    (match) => `You can buy up to ${match[1]} of one item at a time.`,
  ],
  [
    /^An order holds at most (\d+) different products$/i,
    (match) =>
      `An order can hold at most ${match[1]} different products. Remove some from your cart.`,
  ],
  [
    /^quantity must not be greater than (\d+)$/i,
    (match) => `You can buy up to ${match[1]} of one item at a time.`,
  ],
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

// The refusals of the payment simulator on the demo payment page ("Try a tricky
// case"), in short sentences for the visitor. Display only. The status decides
// the sentence; for a 409 the backend's message tells which rule refused, and the
// number of minutes in it is kept. An unknown message gets a general sentence,
// never the backend's own wording, which talks about queues and events.
const SIMULATOR_TRY_AGAIN = "We could not run that case. Please try again.";

export function toSimulatorMessage(status: number, message: string): string {
  if (status === 404) {
    return "We could not find this payment, or tricky cases are not available for it.";
  }
  if (status === 429) {
    return "That was a lot of tries in a short time. Please wait a minute and try again.";
  }
  if (status === 400) return SIMULATOR_TRY_AGAIN;
  if (status === 0) {
    return "Payments are unavailable right now. Please try again.";
  }
  if (status === 409) {
    if (/already finished/i.test(message)) {
      return "This payment is already finished, so no more cases can be run on it. Start a new payment from your order to try another.";
    }
    const minutes = message.match(/last (\d+) minutes/i);
    if (minutes) {
      return `This case only works on a payment started in the last ${minutes[1]} minutes. Start a new payment from your order and try again.`;
    }
    if (/still waiting for payment/i.test(message)) {
      return "This case only works while the order is still waiting for payment.";
    }
    if (/queue|paused/i.test(message)) {
      return "This case is paused for the moment. Try another one.";
    }
    return "This case cannot run right now. Try another one, or start a new payment from your order.";
  }
  return SIMULATOR_TRY_AGAIN;
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
