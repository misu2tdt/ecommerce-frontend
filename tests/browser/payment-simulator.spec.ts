import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { findBannedTerms, pageText } from "./support/banned-terms";
import {
  RESULT,
  backendState,
  browserLogins,
  failPayment,
  lowContrast,
  pageTextOutsideResult,
  signInAsShopper,
  startOpenPayment,
} from "./support/payment-simulator";
import {
  MIN_READABLE_SHARE,
  measureReadableShare,
} from "./support/readable-share";
import {
  cancelOrderQuietly,
  createShopper,
  listEvents,
  loginsPerformed,
  resolveOpenEventsOf,
  type TestShopper,
} from "./support/reconciliation";
import { orderStatus, skipProductPhotos } from "./support/shop";

// "Try a tricky case" on the demo payment page: four practice cases that the
// backend runs and explains. The page sends only the case; what it shows
// afterwards (the explanation, the steps, the statuses) is the backend's answer,
// so these tests check it against what the backend really did to the payment and
// the order. One order per case, made over the API for a shopper of the spec's
// own, and every order that is still unpaid is cancelled again at the end.
//
// The delayed case is not run here: it needs the real 10 seconds, so it is
// covered by the unit tests of the waiting logic (tests/unit/payment-simulator).
//
// Stock: each order takes one pair of socks. The spec asks for a variant with
// stock to spare but never counts on how much there is.

const LABELS = [
  "Send success twice",
  "Success after the order expired",
  "Delayed success, arrives in 10 s",
  "Tampered signature",
];
// The unresolved-review limit above which the backend pauses the expiry case.
const REVIEW_QUEUE_CAP = 12;

test.describe.configure({ mode: "serial" });

let api: APIRequestContext;
let shopper: TestShopper;
const unpaidOrders: number[] = [];

test.beforeAll(async () => {
  test.setTimeout(120_000);
  api = await playwrightRequest.newContext();
  shopper = await createShopper(api, 8);
});

test.afterAll(async () => {
  try {
    for (const orderId of unpaidOrders) {
      await cancelOrderQuietly(api, shopper, orderId);
    }
    // Reviews this spec made are resolved, so the open queue is what it was.
    await resolveOpenEventsOf(api, shopper, "payment simulator smoke test");
  } finally {
    console.log(
      `payment simulator spec logins: ${JSON.stringify({
        ...loginsPerformed(),
        browser: browserLogins(),
      })}`,
    );
    await api.dispose();
  }
});

test.beforeEach(async ({ page }) => {
  await skipProductPhotos(page);
  await signInAsShopper(page, shopper);
});

async function openPaymentPage(
  page: Page,
  orderId: number,
  paymentId: number,
  width = 1440,
) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/demo-pay/${paymentId}?order=${orderId}`);
  await expect(
    page.getByRole("button", { name: "Pay now", exact: true }),
  ).toBeVisible();
  // The section opens from a client event: wait until the page is interactive.
  await page.waitForLoadState("networkidle");
}

const summary = (page: Page) =>
  page.getByText("Try a tricky case", { exact: true });
const caseButton = (page: Page, label: string) =>
  page.getByRole("button", { name: label, exact: true });
const panel = (page: Page) => page.locator(RESULT);
const steps = (page: Page) =>
  panel(page).getByRole("list", { name: "Steps" }).getByRole("listitem");

async function openSection(page: Page) {
  await summary(page).click();
  await expect(caseButton(page, LABELS[0])).toBeVisible();
}

async function expectCasesDisabled(page: Page, disabled: boolean) {
  for (const label of LABELS) {
    const button = caseButton(page, label);
    if (disabled) await expect(button, label).toBeDisabled();
    else await expect(button, label).toBeEnabled();
  }
}

// The status words on the panel, next to what the backend says.
async function expectShownStatuses(
  page: Page,
  backend: { payment: { status: string }; order: { status: string } },
  orderLabel: string,
) {
  const result = panel(page);
  await expect(
    result.getByText(backend.payment.status, { exact: true }),
    "payment status on the panel",
  ).toBeVisible();
  await expect(
    result.locator(`[aria-label="Order status: ${orderLabel}"]`),
    "order status on the panel",
  ).toBeVisible();
}

test("send success twice: the order is paid once, and the steps say so", async ({
  page,
}) => {
  const { orderId, paymentId } = await startOpenPayment(api, shopper);
  unpaidOrders.push(orderId);

  await openPaymentPage(page, orderId, paymentId);
  // Closed at first: the three buttons of the page are the only choices.
  for (const label of LABELS) {
    await expect(caseButton(page, label)).toHaveCount(0);
  }
  await expect(page.locator("main button")).toHaveCount(3);
  await openSection(page);

  // A double click runs the case once: a second run would be refused (the
  // payment is paid by then) and would replace the panel with an error.
  await caseButton(page, LABELS[0]).dblclick();

  await expect(
    panel(page).getByRole("heading", { name: "What happened" }),
  ).toBeVisible();
  await expect(panel(page)).toHaveCount(1);
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);

  // The backend's own explanation, then its two steps with readable results.
  await expect(panel(page)).toContainText("delivered twice");
  await expect(steps(page)).toHaveCount(2);
  await expect(steps(page).nth(0)).toContainText("Sent: a signed success event");
  await expect(steps(page).nth(0)).toContainText("Result: Applied (HTTP 200)");
  await expect(steps(page).nth(1)).toContainText(
    "Sent: the same signed success event again (a retry)",
  );
  await expect(steps(page).nth(1)).toContainText(
    "Result: Ignored: seen before (HTTP 200)",
  );
  // No code names leak into the page.
  await expect(panel(page)).not.toContainText(/[a-z]+_[a-z]+/);

  // The final statuses are the backend's.
  const backend = await backendState(api, shopper, orderId, paymentId);
  expect(backend.payment.status).toBe("succeeded");
  expect(backend.order.status).toBe("confirmed");
  await expectShownStatuses(page, backend, "Confirmed");

  // Paid: the cases are switched off, and say why.
  await expectCasesDisabled(page, true);
  await expect(
    page.getByText("This payment is finished, so no more cases can be run on it."),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("link", { name: "View order" }),
  ).toHaveAttribute("href", `/account/orders/${orderId}`);

  // The order page agrees, reached with the link on the panel (the paid order is
  // left as it is: it cannot be undone).
  await panel(page).getByRole("link", { name: "View order" }).click();
  await expect(page).toHaveURL(new RegExp(`/account/orders/${orderId}$`));
  await expect(orderStatus(page, "Confirmed")).toBeVisible();
  unpaidOrders.splice(unpaidOrders.indexOf(orderId), 1);
});

test("success after the order expired: the late payment is held for review, the order stays cancelled", async ({
  page,
}) => {
  const queue = await listEvents(api, "unresolved", 1, 1);
  test.skip(
    queue.total >= REVIEW_QUEUE_CAP,
    `${queue.total} reviews are open: the backend pauses this case from ${REVIEW_QUEUE_CAP}`,
  );

  const { orderId, paymentId } = await startOpenPayment(api, shopper);
  unpaidOrders.push(orderId);
  try {
    await openPaymentPage(page, orderId, paymentId);
    await openSection(page);
    await caseButton(page, LABELS[1]).click();

    await expect(
      panel(page).getByRole("heading", { name: "What happened" }),
    ).toBeVisible();
    await expect(panel(page)).toContainText("too late");
    await expect(steps(page)).toHaveCount(2);
    await expect(steps(page).nth(0)).toContainText(
      "Sent: the order was made to expire now (forced, not waited for)",
    );
    await expect(steps(page).nth(0)).toContainText(
      "Result: Order expired now (HTTP 200)",
    );
    await expect(steps(page).nth(1)).toContainText(
      "Sent: a signed success event, too late",
    );
    await expect(steps(page).nth(1)).toContainText(
      "Result: Held for review (HTTP 200)",
    );

    // What the backend did: the order is cancelled, not paid, and the late event
    // is waiting for an admin.
    const backend = await backendState(api, shopper, orderId, paymentId);
    expect(backend.order.status).toBe("cancelled");
    expect(backend.payment.status).not.toBe("succeeded");
    await expectShownStatuses(page, backend, "Cancelled");
    const open = await listEvents(api, "unresolved", 1, 100);
    expect(
      open.items.filter((event) => event.payment.id === paymentId),
      "one review item for this payment",
    ).toHaveLength(1);

    // Nothing more can be run on a finished payment.
    await expectCasesDisabled(page, true);
  } finally {
    await resolveOpenEventsOf(api, shopper, "payment simulator smoke test");
    await cancelOrderQuietly(api, shopper, orderId);
  }
});

// Not a 10 second wait: the page's own clock is moved forward, so the page looks
// once straight away and the event the backend holds back for 10 real seconds has
// not arrived yet. That is the calm "may have been lost" state; the state where
// the event did arrive is covered by the unit tests of the waiting logic.
test("delayed success: the page waits, looks once when its timer is due, and never polls", async ({
  page,
}) => {
  const { orderId, paymentId } = await startOpenPayment(api, shopper);
  unpaidOrders.push(orderId);
  try {
    await page.clock.install();
    const actions: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.headers()["next-action"]) {
        actions.push(request.url());
      }
    });

    await openPaymentPage(page, orderId, paymentId);
    await openSection(page);
    await caseButton(page, LABELS[2]).click();

    // The answer is immediate and says nothing has happened yet.
    await expect(
      panel(page).getByRole("heading", { name: "What happened" }),
    ).toBeVisible();
    await expect(panel(page)).toContainText("held back");
    await expect(steps(page)).toHaveCount(1);
    await expect(steps(page).nth(0)).toContainText(
      "Sent: a signed success event, to be delivered in 10 seconds",
    );
    await expect(steps(page).nth(0)).toContainText(
      "Result: Scheduled for later (HTTP 202)",
    );
    // The waiting state: a note, the cases switched off, statuses as they are.
    await expect(
      panel(page).getByText("Waiting for the delayed confirmation."),
    ).toBeVisible();
    await expectCasesDisabled(page, true);
    await expect(
      panel(page).locator('[aria-label="Order status: Awaiting payment"]'),
    ).toBeVisible();
    expect(actions, "only the case itself has been sent").toHaveLength(1);

    // The timer is due: one look at the payment.
    await page.clock.fastForward(12_000);
    await expect(
      panel(page).getByText(/The delayed confirmation has not arrived\./),
    ).toBeVisible();
    await expect(panel(page)).toContainText("Pay now above");
    await expect(
      panel(page).getByText("Waiting for the delayed confirmation."),
    ).toHaveCount(0);
    expect(actions, "the case, then one look").toHaveLength(2);
    // Still processing, and the cases can be tried again.
    await expectCasesDisabled(page, false);

    // No polling: a long time later there has been no other look.
    await page.clock.fastForward(10 * 60_000);
    await page.waitForTimeout(500);
    expect(actions).toHaveLength(2);

    // The way out the message names: the normal Pay now button. It also settles
    // the payment, so the event the backend still holds back changes nothing.
    await page.getByRole("button", { name: "Pay now", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/account/orders/${orderId}$`));
    await expect(orderStatus(page, "Confirmed")).toBeVisible();
    unpaidOrders.splice(unpaidOrders.indexOf(orderId), 1);
  } finally {
    // Only an order that is still unpaid is cancelled (the paid one stays).
    if (unpaidOrders.includes(orderId)) {
      await cancelOrderQuietly(api, shopper, orderId);
    }
  }
});

test("tampered signature: rejected, nothing changes; the section fits and reads well on every screen", async ({
  page,
}) => {
  const { orderId, paymentId } = await startOpenPayment(api, shopper);
  unpaidOrders.push(orderId);
  try {
    await openPaymentPage(page, orderId, paymentId);
    await openSection(page);

    // The four choices: a label, a line of explanation, a comfortable target.
    for (const label of LABELS) {
      const button = caseButton(page, label);
      await expect(button).toBeVisible();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    for (const line of [
      "The same payment confirmation arrives two times. The order is paid only once.",
      "The order expires first, then a confirmation arrives too late. It is held for review, not applied.",
      "The confirmation is slow: the payment waits about 10 seconds before it goes through.",
      "A confirmation that was changed after it was signed. It is rejected and nothing changes.",
    ]) {
      await expect(page.getByText(line, { exact: true })).toBeVisible();
    }
    // The amount is still never something a visitor can type.
    await expect(page.locator('main input:not([type="hidden"])')).toHaveCount(0);

    // Shopper language over the whole page, section open, nothing run yet.
    expect(findBannedTerms(await pageText(page))).toEqual([]);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `page width at ${width}px`,
      ).toBeLessThanOrEqual(width);
      const { total, readable } = await measureReadableShare(page);
      expect(readable / total, `readable text at ${width}px`).toBeGreaterThanOrEqual(
        MIN_READABLE_SHARE,
      );
    }
    expect(await lowContrast(page, "main details")).toEqual([]);

    // Run the case.
    await page.setViewportSize({ width: 1440, height: 900 });
    await caseButton(page, LABELS[3]).click();
    await expect(
      panel(page).getByRole("heading", { name: "What happened" }),
    ).toBeVisible();
    await expect(panel(page)).toContainText("signature");
    await expect(steps(page)).toHaveCount(1);
    await expect(steps(page).nth(0)).toContainText(
      "Sent: a success event that was changed after it was signed",
    );
    await expect(steps(page).nth(0)).toContainText(
      "Result: Rejected: signature does not match (HTTP 401)",
    );

    // Nothing changed: the payment is still open and the order unpaid.
    const backend = await backendState(api, shopper, orderId, paymentId);
    expect(["pending", "processing"]).toContain(backend.payment.status);
    expect(backend.order.status).toBe("pending");
    await expectShownStatuses(page, backend, "Awaiting payment");
    // The payment is still open, so another case can be tried.
    await expectCasesDisabled(page, false);

    // The backend's words are allowed inside the result panel only: the rest of
    // the page is still scanned in full.
    expect(findBannedTerms(await pageTextOutsideResult(page))).toEqual([]);

    // With the result on screen: still no sideways scroll, readable, contrast.
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `page width at ${width}px (result shown)`,
      ).toBeLessThanOrEqual(width);
      const { total, readable } = await measureReadableShare(page);
      expect(
        readable / total,
        `readable text at ${width}px (result shown)`,
      ).toBeGreaterThanOrEqual(MIN_READABLE_SHARE);
    }
    expect(await lowContrast(page, "main details")).toEqual([]);

    // A refusal reads as a short sentence: the payment finishes elsewhere, then
    // the case is tried on the page that is still open (the backend answers 409).
    await failPayment(api, shopper, paymentId);
    await page.setViewportSize({ width: 1440, height: 900 });
    await caseButton(page, LABELS[3]).click();
    const alert = page.locator('main [role="alert"]');
    await expect(alert).toHaveText(
      "This payment is already finished, so no more cases can be run on it. Start a new payment from your order to try another.",
    );
    expect(findBannedTerms(await alert.innerText())).toEqual([]);
    await expect(panel(page)).toHaveCount(0);
    // The buttons work again for the next try.
    await expectCasesDisabled(page, false);
  } finally {
    await cancelOrderQuietly(api, shopper, orderId);
  }
});
