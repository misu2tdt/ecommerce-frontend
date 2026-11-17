import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { CUSTOMER, signIn, vietnamParts } from "./support/shop";
import {
  adminGet,
  adminUserId,
  cancelOrderQuietly,
  createFailureAfterSuccessEvent,
  createLateSuccessEvent,
  createOrderWithTwoEvents,
  createOrderWithTwoPayments,
  createOrderWithoutPayment,
  createShopper,
  listEvents,
  loginsPerformed,
  resolveOpenEvents,
  resolveOpenEventsOf,
  resolveViaApi,
  signInAsAdmin,
  type TestEvent,
  type TestShopper,
} from "./support/reconciliation";

// The payment reconciliation queue against the real seeded backend. The events
// are made the way a shopper makes them (a payment completed after its order was
// cancelled, or a failure after a success), through a shopper registered for
// this run. The API can not delete events, so every event a test opens is
// resolved before the run ends and the open queue is left empty.

const PATH = "/admin/reconciliation";
const NOTE_PREFIX = "Smoke test";
const NOTE_RESOLVED = `${NOTE_PREFIX}: refunded in the provider portal`;
const NOTE_UI = `${NOTE_PREFIX}: refunded by hand, receipt kept`;

// More than one page (20) of open events, so paging can be tested.
const BULK_EVENTS = 22;

test.describe.configure({ mode: "serial" });

let api: APIRequestContext;
let shopper: TestShopper | undefined;
let adminId: number;
const bulk: TestEvent[] = [];
let failureType: TestEvent;
let toResolveInUi: TestEvent;
let conflictEvent: TestEvent;
let doubleClickEvent: TestEvent;
let alreadyResolved: TestEvent;
// Orders for the order page and the order filter.
let orderWithoutPayment: number;
let orderWithTwoPayments: Awaited<ReturnType<typeof createOrderWithTwoPayments>>;
let orderWithTwoEvents: Awaited<ReturnType<typeof createOrderWithTwoEvents>>;

test.beforeAll(async () => {
  test.setTimeout(240_000);
  api = await playwrightRequest.newContext();
  adminId = await adminUserId(api);
  shopper = await createShopper(api, BULK_EVENTS + 20);

  // Made first, so the events below stay the newest of the queue.
  orderWithoutPayment = await createOrderWithoutPayment(api, shopper);
  orderWithTwoPayments = await createOrderWithTwoPayments(api, shopper);
  orderWithTwoEvents = await createOrderWithTwoEvents(api, shopper);
  // The first of its two events is handled, the second stays open.
  expect(
    await resolveViaApi(api, orderWithTwoEvents.eventIds[0], NOTE_RESOLVED),
  ).toBe(200);

  for (let index = 0; index < BULK_EVENTS; index += 1) {
    bulk.push(await createLateSuccessEvent(api, shopper));
  }
  failureType = await createFailureAfterSuccessEvent(api, shopper);
  toResolveInUi = await createLateSuccessEvent(api, shopper);
  conflictEvent = await createLateSuccessEvent(api, shopper);
  doubleClickEvent = await createLateSuccessEvent(api, shopper);
  // Created last, so it is the newest and first on the Resolved list.
  alreadyResolved = await createLateSuccessEvent(api, shopper);
  expect(await resolveViaApi(api, alreadyResolved.eventId, NOTE_RESOLVED)).toBe(
    200,
  );
});

test.afterAll(async () => {
  // Leave nothing of this run open, even when a test or the set-up failed half
  // way: every open event of this run's shopper is resolved (an event that is
  // already resolved is fine), without a login of its own.
  try {
    if (api && shopper) {
      await resolveOpenEventsOf(api, shopper, `${NOTE_PREFIX}: clean-up`);
      // The unpaid order would otherwise keep its stock reserved.
      if (orderWithoutPayment) {
        await cancelOrderQuietly(api, shopper, orderWithoutPayment);
      }
    }
  } finally {
    // How close the run came to the limit of 20 logins a minute per email.
    console.log(
      `reconciliation spec logins: ${JSON.stringify(loginsPerformed())}`,
    );
    await api?.dispose();
  }
});

async function openQueue(page: Page, path = PATH, width = 1440) {
  await signInAsAdmin(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

const rowOf = (page: Page, event: TestEvent) =>
  page.getByRole("row").filter({
    // Not followed by a digit. (\b would not work: the status badge follows the
    // link with no space in the row's text, so "104" and "Confirmed" touch.)
    hasText: new RegExp(`Order #${event.orderId}(?!\\d)`),
  });

const dialogOf = (page: Page, event: TestEvent) =>
  page.getByRole("dialog", {
    name: `Resolve event #${event.eventId}`,
    exact: true,
  });

async function openDialog(page: Page, event: TestEvent) {
  await rowOf(page, event)
    .getByRole("button", {
      name: `Resolve event #${event.eventId}`,
      exact: true,
    })
    .click();
  const dialog = dialogOf(page, event);
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("the list", () => {
  test("shows the open events newest first, as the backend returns them", async ({
    page,
  }) => {
    await openQueue(page);
    await expect(
      page.getByRole("heading", { level: 2, name: "Payment reconciliation" }),
    ).toBeVisible();

    const fromApi = await listEvents(api, "unresolved", 1, 20);
    expect(fromApi.total).toBeGreaterThan(BULK_EVENTS);
    await expect(page.getByText(/^\d+ events?$/)).toHaveText(
      `${fromApi.total} events`,
    );

    const headings = page.getByRole("columnheader");
    await expect(headings).toHaveText([
      "Received",
      "Order",
      "Payment",
      "Amount",
      "Event",
      "What happened",
      "Resolution",
      "Actions",
    ]);

    const rows = page.getByRole("table").getByRole("row");
    // The header row plus one row for each event of the page, in the API's order.
    await expect(rows).toHaveCount(fromApi.items.length + 1);
    for (const [index, item] of fromApi.items.slice(0, 5).entries()) {
      const row = rows.nth(index + 1);
      await expect(row).toContainText(`Order #${item.order.id}`);
      await expect(row).toContainText(`Event #${item.id}`);
      await expect(row).toContainText(`Payment #${item.payment.id}`);
      await expect(row).toContainText(item.provider);
      await expect(row).toContainText(item.providerPaymentId);
      // The strings are the backend's own, not relabelled.
      await expect(row).toContainText(item.payment.status);
      await expect(row).toContainText(item.eventType);
      await expect(row).toContainText(item.suggestedAction);
      if (item.processingMessage) {
        await expect(row).toContainText(item.processingMessage);
      }
      await expect(row).toContainText(
        item.payment.amount.toLocaleString("vi-VN"),
      );
      await expect(row).toContainText("₫");
      await expect(row).toContainText("Unresolved");
      await expect(
        row.getByRole("link", { name: `Order #${item.order.id}` }),
      ).toHaveAttribute("href", `/admin/orders/${item.order.id}`);
      await expect(
        row.locator(`[aria-label="Order status: Cancelled"]`),
      ).toHaveCount(item.order.status === "cancelled" ? 1 : 0);
    }
  });

  test("shows a failure that arrived after a success next to its confirmed order", async ({
    page,
  }) => {
    await openQueue(page);
    const row = rowOf(page, failureType);
    await expect(row).toContainText("failed");
    await expect(row).toContainText("succeeded");
    await expect(
      row.locator(`[aria-label="Order status: Confirmed"]`),
    ).toBeVisible();
    await expect(row).toContainText("Review: failure arrived after success");
  });

  test("the status filter switches between unresolved, resolved and all", async ({
    page,
  }) => {
    await openQueue(page);
    const filter = page.getByRole("navigation", {
      name: "Reconciliation status filter",
    });
    await expect(
      filter.getByRole("link", { name: "Unresolved", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(rowOf(page, alreadyResolved)).toHaveCount(0);
    await expect(rowOf(page, conflictEvent)).toHaveCount(1);

    await filter.getByRole("link", { name: "Resolved", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reconciliation\?status=resolved$/);
    await expect(
      filter.getByRole("link", { name: "Resolved", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    const resolvedRow = rowOf(page, alreadyResolved);
    await expect(resolvedRow).toHaveCount(1);
    // Who, when and what was written.
    await expect(resolvedRow).toContainText("Resolved");
    await expect(resolvedRow).toContainText(`Admin #${adminId}`);
    await expect(resolvedRow).toContainText(NOTE_RESOLVED);
    await expect(resolvedRow.getByRole("button")).toHaveCount(0);
    await expect(rowOf(page, conflictEvent)).toHaveCount(0);

    await filter.getByRole("link", { name: "All", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reconciliation\?status=all$/);
    await expect(rowOf(page, alreadyResolved)).toHaveCount(1);
    await expect(rowOf(page, conflictEvent)).toHaveCount(1);

    await filter.getByRole("link", { name: "Unresolved", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reconciliation$/);
    await expect(rowOf(page, alreadyResolved)).toHaveCount(0);

    const resolvedFromApi = await listEvents(api, "resolved", 1, 1);
    await page.goto(`${PATH}?status=resolved`);
    await expect(page.getByText(/^\d+ events?$/)).toHaveText(
      `${resolvedFromApi.total} ${resolvedFromApi.total === 1 ? "event" : "events"}`,
    );
  });

  test("pages 20 at a time and keeps the filter in the page links", async ({
    page,
  }) => {
    await openQueue(page);
    const open = await listEvents(api, "unresolved", 1, 1);
    expect(open.total).toBeGreaterThan(20);

    await expect(page.getByText(/^Showing 1–20 of \d+$/)).toHaveText(
      `Showing 1–20 of ${open.total}`,
    );
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(21);

    await page.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL(/\/admin\/reconciliation\?page=2$/);
    const secondPage = await listEvents(api, "unresolved", 2, 20);
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(
      secondPage.items.length + 1,
    );
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: `Event #${secondPage.items[0].id}` }),
    ).toHaveCount(1);

    await page.goto(`${PATH}?status=all`);
    await page.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL(/\/admin\/reconciliation\?status=all&page=2$/);

    // A page past the end goes to the last one; an unusable value to page 1.
    await page.goto(`${PATH}?page=9999`);
    const lastPage = Math.ceil(open.total / 20);
    await expect(page).toHaveURL(
      new RegExp(`/admin/reconciliation\\?page=${lastPage}$`),
    );
    await page.goto(`${PATH}?page=abc`);
    await expect(page).toHaveURL(/\/admin\/reconciliation$/);
  });
});

test.describe("resolving", () => {
  test("asks for a note of 3 to 500 characters and says what resolving does", async ({
    page,
  }) => {
    await openQueue(page);
    const dialog = await openDialog(page, toResolveInUi);

    // What resolving does and does not do.
    await expect(dialog).toContainText(
      "does not change any order, payment or stock",
    );
    await expect(dialog).toContainText(`Order #${toResolveInUi.orderId}`);
    await expect(
      dialog.getByRole("textbox", { name: "Resolution note" }),
    ).toBeFocused();

    const note = dialog.getByLabel("Resolution note");
    const submit = dialog.getByRole("button", { name: "Record resolution" });
    await expect(submit).toBeDisabled();
    await expect(dialog.getByText("0 / 500", { exact: true })).toBeVisible();

    await note.fill("ab");
    await note.blur();
    await expect(dialog.getByText(/Write at least 3 characters/)).toBeVisible();
    await expect(dialog.getByText("2 / 500", { exact: true })).toBeVisible();
    await expect(submit).toBeDisabled();

    // Spaces around the note are not counted.
    await note.fill("     ab     ");
    await expect(dialog.getByText("2 / 500", { exact: true })).toBeVisible();
    await expect(submit).toBeDisabled();

    await note.fill("x".repeat(501));
    await expect(dialog.getByText(/at most 500 characters/)).toBeVisible();
    await expect(dialog.getByText("501 / 500", { exact: true })).toBeVisible();
    await expect(submit).toBeDisabled();

    await note.fill("abc");
    await expect(submit).toBeEnabled();
    await expect(dialog.getByText("3 / 500", { exact: true })).toBeVisible();

    // Escape and Cancel close it without sending anything.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(rowOf(page, toResolveInUi)).toHaveCount(1);
    expect(
      (await listEvents(api, "all", 1, 100)).items.find(
        (item) => item.id === toResolveInUi.eventId,
      )!.resolvedAt,
    ).toBeNull();
  });

  test("records the resolution, refreshes the list and leaves orders, payments and stock alone", async ({
    page,
  }) => {
    await openQueue(page);
    const before = await listEvents(api, "unresolved", 1, 1);
    const orderBefore = await (
      await adminGet(api, `/admin/orders/${toResolveInUi.orderId}`)
    ).json();

    const dialog = await openDialog(page, toResolveInUi);
    await dialog.getByLabel("Resolution note").fill(`  ${NOTE_UI}  `);
    await dialog.getByRole("button", { name: "Record resolution" }).click();

    await expect(
      dialog.getByRole("status").filter({
        hasText: `Event #${toResolveInUi.eventId} is recorded as resolved`,
      }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    // The open list no longer has it, and the count went down by one.
    await expect(rowOf(page, toResolveInUi)).toHaveCount(0);
    await expect(page.getByText(/^\d+ events?$/)).toHaveText(
      `${before.total - 1} ${before.total - 1 === 1 ? "event" : "events"}`,
    );

    // The backend holds the trimmed note and this admin.
    const stored = (await listEvents(api, "resolved", 1, 100)).items.find(
      (item) => item.id === toResolveInUi.eventId,
    );
    expect(stored?.resolutionNote).toBe(NOTE_UI);
    expect(stored?.resolvedByUserId).toBe(adminId);
    expect(stored?.resolvedAt).not.toBeNull();

    // Nothing else changed.
    const orderAfter = await (
      await adminGet(api, `/admin/orders/${toResolveInUi.orderId}`)
    ).json();
    expect(orderAfter.status).toBe(orderBefore.status);
    expect(orderAfter.totalPrice).toBe(orderBefore.totalPrice);

    // The resolved list shows who, when and the note.
    await page.goto(`${PATH}?status=resolved`);
    const row = rowOf(page, toResolveInUi);
    await expect(row).toContainText(`Admin #${adminId}`);
    await expect(row).toContainText(NOTE_UI);
  });

  test("sends one request when the button is clicked twice", async ({
    page,
  }) => {
    await openQueue(page);
    let sent = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.headers()["next-action"]) {
        sent += 1;
      }
    });

    const dialog = await openDialog(page, doubleClickEvent);
    await dialog
      .getByLabel("Resolution note")
      .fill(`${NOTE_PREFIX}: double click`);
    await dialog.getByRole("button", { name: "Record resolution" }).dblclick();

    await expect(
      dialog.getByRole("status").filter({ hasText: "is recorded as resolved" }),
    ).toBeVisible();
    expect(sent, "requests sent to resolve the event").toBe(1);
    await dialog.getByRole("button", { name: "Close" }).click();

    const stored = (await listEvents(api, "resolved", 1, 100)).items.find(
      (item) => item.id === doubleClickEvent.eventId,
    );
    expect(stored?.resolutionNote).toBe(`${NOTE_PREFIX}: double click`);
  });

  test("shows the backend's message when the event was resolved in the meantime, and refreshes", async ({
    page,
  }) => {
    await openQueue(page);
    const dialog = await openDialog(page, conflictEvent);
    await dialog
      .getByLabel("Resolution note")
      .fill(`${NOTE_PREFIX}: second admin`);

    // Another admin resolves it while this dialog is open.
    expect(
      await resolveViaApi(
        api,
        conflictEvent.eventId,
        `${NOTE_PREFIX}: first admin`,
      ),
    ).toBe(200);

    await dialog.getByRole("button", { name: "Record resolution" }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Payment event is already resolved",
    );
    // The dialog stays open, can be closed, and the button works again.
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeEnabled();
    // The list behind it was refreshed: the event is no longer open.
    await expect(rowOf(page, conflictEvent)).toHaveCount(0);

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // The note that was kept is the first admin's.
    const stored = (await listEvents(api, "resolved", 1, 100)).items.find(
      (item) => item.id === conflictEvent.eventId,
    );
    expect(stored?.resolutionNote).toBe(`${NOTE_PREFIX}: first admin`);
  });
});

test.describe("navigation and dashboard", () => {
  test("the admin navigation links to the queue and marks it as the current page", async ({
    page,
  }) => {
    await openQueue(page, "/admin");
    const nav = page.getByRole("navigation", { name: "Admin sections" });
    await expect(
      nav.getByRole("link", { name: "Reconciliation" }),
    ).toHaveAttribute("href", "/admin/reconciliation");
    await expect(
      nav.getByRole("link", { name: "Reconciliation" }),
    ).not.toHaveAttribute("aria-current", "page");

    await nav.getByRole("link", { name: "Reconciliation" }).click();
    await expect(page).toHaveURL(/\/admin\/reconciliation$/);
    await expect(
      nav.getByRole("link", { name: "Reconciliation" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("the dashboard counts the open items", async ({ page }) => {
    await openQueue(page, "/admin");
    const open = await listEvents(api, "unresolved", 1, 1);
    const card = page.getByRole("link", { name: /^Reconciliation\s*\d+/ });
    await expect(card).toHaveAttribute("href", "/admin/reconciliation");
    await expect(card).toContainText(String(open.total));
    await expect(card).toContainText(
      open.total === 1 ? "Open item to review" : "Open items to review",
    );
  });

  for (const width of [1280, 1440, 1920]) {
    test(`the admin navigation fits inside the page at ${width}px`, async ({
      page,
    }) => {
      await openQueue(page, PATH, width);
      const fit = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Admin sections"]')!;
        const links = Array.from(nav.querySelectorAll("a"));
        const lines = (element: Element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return new Set(
            Array.from(range.getClientRects(), (rect) => Math.round(rect.top)),
          ).size;
        };
        return {
          pageWidth: document.documentElement.scrollWidth,
          navRight: nav.getBoundingClientRect().right,
          rightmost: Math.max(
            ...links.map((link) => link.getBoundingClientRect().right),
          ),
          labelsThatWrap: links
            .filter((link) => lines(link) > 1)
            .map((link) => link.textContent),
          count: links.length,
        };
      });
      // Ten sections (Analytics is the newest) and the way back to the storefront.
      expect(fit.count).toBe(11);
      expect(fit.pageWidth).toBeLessThanOrEqual(width);
      expect(fit.rightmost).toBeLessThanOrEqual(fit.navRight + 0.5);
      expect(fit.rightmost).toBeLessThanOrEqual(width);
      expect(fit.labelsThatWrap).toEqual([]);
    });
  }

  test("the queue does not scroll sideways on a phone and is out of search results", async ({
    page,
  }) => {
    await openQueue(page, PATH, 390);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await expect(page.getByRole("table")).toBeVisible();

    const robots = await page.evaluate(
      () =>
        document
          .querySelector('meta[name="robots"]')
          ?.getAttribute("content") ?? "",
    );
    expect(robots).toMatch(/noindex/);
  });
});

interface ApiPayment {
  id: number;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  succeededAt: string | null;
}

const PAYMENTS_LINK = "View reconciliation items for this order";

test.describe("the order page and the order filter", () => {
  test("the order page lists the payments newest first, as the backend returns them", async ({
    page,
  }) => {
    const { orderId, firstPaymentId, secondPaymentId } = orderWithTwoPayments;
    await openQueue(page, `/admin/orders/${orderId}`);

    const fromApi = (await (
      await adminGet(api, `/admin/orders/${orderId}`)
    ).json()) as { payments: ApiPayment[] };
    expect(fromApi.payments.map((payment) => payment.id)).toEqual([
      secondPaymentId,
      firstPaymentId,
    ]);

    const region = page.getByRole("region", { name: "Payments" });
    await expect(region).toBeVisible();
    const items = region.getByRole("listitem");
    await expect(items).toHaveCount(2);
    for (const [index, payment] of fromApi.payments.entries()) {
      const item = items.nth(index);
      await expect(item).toContainText(`Payment #${payment.id}`);
      await expect(item).toContainText(payment.provider);
      // The backend's own status word.
      await expect(item).toContainText(payment.status);
      await expect(item).toContainText(payment.amount.toLocaleString("vi-VN"));
      await expect(item).toContainText("₫");
      const created = vietnamParts(payment.createdAt);
      await expect(item).toContainText(`${created.date}, ${created.time}`);
      if (payment.succeededAt) {
        const succeeded = vietnamParts(payment.succeededAt);
        await expect(item).toContainText(
          `Succeeded${succeeded.date}, ${succeeded.time}`,
        );
      } else {
        await expect(item).not.toContainText("Succeeded");
      }
    }
    // The first attempt failed and the second one succeeded.
    await expect(items.nth(0)).toContainText("succeeded");
    await expect(items.nth(1)).toContainText("failed");
    // The rest of the page is still there.
    await expect(page.getByRole("heading", { name: "Purchased items" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Update status" })).toBeVisible();
  });

  test("an order that was never paid for says so and has no link to the queue", async ({
    page,
  }) => {
    await openQueue(page, `/admin/orders/${orderWithoutPayment}`);

    const region = page.getByRole("region", { name: "Payments" });
    await expect(region).toBeVisible();
    await expect(region).toContainText("No payment attempts yet");
    await expect(region.getByRole("listitem")).toHaveCount(0);
    await expect(page.getByRole("link", { name: PAYMENTS_LINK })).toHaveCount(0);
  });

  test("an order with a payment links to its events, shown with the order chip", async ({
    page,
  }) => {
    const { orderId } = orderWithTwoEvents;
    await openQueue(page, `/admin/orders/${orderId}`);

    const link = page.getByRole("link", { name: PAYMENTS_LINK });
    await expect(link).toHaveAttribute(
      "href",
      `/admin/reconciliation?orderId=${orderId}&status=all`,
    );
    await link.click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/reconciliation\\?orderId=${orderId}&status=all$`),
    );
    await expect(page.getByText(`Filtered by order #${orderId}`)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "2 events" })).toBeVisible();
    // Only rows of this order, the handled one and the open one.
    const rows = page.getByRole("table").getByRole("row");
    await expect(rows).toHaveCount(3);
    for (const index of [1, 2]) {
      await expect(rows.nth(index)).toContainText(`Order #${orderId}`);
    }
    await expect(
      page.getByRole("table").getByText("Resolved", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("table").getByText("Unresolved", { exact: true }),
    ).toHaveCount(1);
  });

  test("the chip names the order, Clear drops it, and the status switch keeps it", async ({
    page,
  }) => {
    const { orderId, eventIds } = orderWithTwoEvents;
    await openQueue(page, `${PATH}?orderId=${orderId}&status=all`);
    const filter = page.getByRole("navigation", {
      name: "Reconciliation status filter",
    });
    const chip = page.getByText(`Filtered by order #${orderId}`);
    await expect(chip).toBeVisible();
    await expect(
      page.getByRole("link", { name: `View order #${orderId}` }),
    ).toHaveAttribute("href", `/admin/orders/${orderId}`);

    // Unresolved: the one open event, the order is kept in the address.
    await filter.getByRole("link", { name: "Unresolved", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/reconciliation\\?orderId=${orderId}$`),
    );
    await expect(chip).toBeVisible();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("table")).toContainText(`Event #${eventIds[1]}`);
    await expect(page.getByRole("table")).not.toContainText(
      `Event #${eventIds[0]}`,
    );

    // Resolved: the handled one.
    await filter.getByRole("link", { name: "Resolved", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/reconciliation\\?orderId=${orderId}&status=resolved$`),
    );
    await expect(chip).toBeVisible();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("table")).toContainText(`Event #${eventIds[0]}`);
    await expect(page.getByRole("table")).toContainText(NOTE_RESOLVED);

    // Clear: the order goes, the status stays, and the queue is whole again.
    await page.getByRole("link", { name: "Clear", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/reconciliation\?status=resolved$/);
    await expect(page.getByText(/^Filtered by order/)).toHaveCount(0);
    const resolvedTotal = (await listEvents(api, "resolved", 1, 1)).total;
    await expect(page.getByRole("status").filter({ hasText: /^\d+ events?$/ })).toHaveText(
      `${resolvedTotal} ${resolvedTotal === 1 ? "event" : "events"}`,
    );
    expect(resolvedTotal).toBeGreaterThan(1);
  });

  test("an order id that is not a positive whole number is ignored and never sent", async ({
    page,
  }) => {
    const open = (await listEvents(api, "unresolved", 1, 1)).total;
    await openQueue(page);
    for (const bad of [
      "abc",
      "0",
      "-1",
      "1.5",
      "1e1",
      "007",
      "2147483648",
      "99999999999999999999",
      "",
    ]) {
      await page.goto(`${PATH}?orderId=${encodeURIComponent(bad)}`);
      // The backend would answer 400 for these; the page shows the whole queue.
      await expect(
        page.getByRole("heading", { level: 2, name: "Payment reconciliation" }),
        `orderId=${bad}`,
      ).toBeVisible();
      await expect(page.getByText(/^Filtered by order/), `orderId=${bad}`).toHaveCount(0);
      await expect(
        page.getByRole("status").filter({ hasText: /^\d+ events?$/ }),
        `orderId=${bad}`,
      ).toHaveText(`${open} ${open === 1 ? "event" : "events"}`);
    }
    // A repeated parameter too.
    await page.goto(`${PATH}?orderId=1&orderId=2`);
    await expect(page.getByText(/^Filtered by order/)).toHaveCount(0);
  });

  test("an order without events gets a message about that order, for each status", async ({
    page,
  }) => {
    const { orderId } = orderWithTwoPayments;
    await openQueue(page, `${PATH}?orderId=${orderId}&status=all`);
    await expect(
      page.getByRole("heading", { name: `No events for order #${orderId}` }),
    ).toBeVisible();
    await expect(page.getByText("has no payment events that needed reconciliation")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText(`Filtered by order #${orderId}`)).toBeVisible();

    await page.getByRole("link", { name: "Unresolved", exact: true }).click();
    await expect(page.getByText("has no unresolved payment events")).toBeVisible();
    await page.getByRole("link", { name: "Resolved", exact: true }).click();
    await expect(page.getByText("has no resolved payment events")).toBeVisible();

    // An order that does not exist is an empty list too, not an error.
    await page.goto(`${PATH}?orderId=2147483647&status=all`);
    await expect(
      page.getByRole("heading", { name: "No events for order #2147483647" }),
    ).toBeVisible();
    await expect(page.getByText("0 events")).toBeVisible();
  });

  test("the order page and the filtered queue do not scroll sideways on a phone", async ({
    page,
  }) => {
    for (const path of [
      `/admin/orders/${orderWithTwoPayments.orderId}`,
      `/admin/orders/${orderWithoutPayment}`,
      `${PATH}?orderId=${orderWithTwoEvents.orderId}&status=all`,
      `${PATH}?orderId=${orderWithTwoPayments.orderId}&status=all`,
    ]) {
      await openQueue(page, path, 390);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${path} at 390px`,
      ).toBeLessThanOrEqual(390);
    }
  });
});
test.describe("access", () => {
  test("a visitor who is not signed in is sent to sign in and back", async ({
    page,
  }) => {
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  });

  test("a customer is told that ADMIN access is required", async ({ page }) => {
    await signIn(page, CUSTOMER);
    await page.goto(PATH);
    await expect(
      page.getByRole("heading", { name: "ADMIN access required" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText("Payment reconciliation")).toHaveCount(0);
  });
});

// Last: it resolves everything that is still open to see the empty state.
test.describe("an empty queue", () => {
  test("says nothing is waiting, and the dashboard counts 0", async ({
    page,
  }) => {
    await resolveOpenEvents(
      api,
      `${NOTE_PREFIX}: emptying the queue to check the empty state`,
    );
    expect((await listEvents(api, "unresolved", 1, 1)).total).toBe(0);

    await openQueue(page);
    await expect(
      page.getByRole("heading", { name: "Nothing to reconcile" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText("0 events")).toBeVisible();

    // The other filters still show what was handled.
    await page.getByRole("link", { name: "Resolved", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(rowOf(page, alreadyResolved)).toHaveCount(1);

    await page.goto("/admin");
    const card = page.getByRole("link", { name: /^Reconciliation\s*0/ });
    await expect(card).toContainText("Open items to review");
  });
});
