import { expect, test, type Page } from "@playwright/test";

// Structure and layout of the home page. Image requests are blocked on purpose:
// CI may be offline for external hosts, and a page whose pictures never load
// must still lay out cleanly. Nothing here depends on a picture arriving.

const CATEGORY_LABELS = [
  "T-Shirts & Tops",
  "Shirts & Polos",
  "Hoodies & Outerwear",
  "Pants & Shorts",
  "Basics & Accessories",
];
const BRAND_LABELS = ["Veloce Active", "Monolith Studio"];

test.beforeEach(async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
  await page.route("**://res.cloudinary.com/**", (route) => route.abort());
});

async function openHome(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

const hero = (page: Page) =>
  page.locator("main section").filter({ has: page.locator("h1") });

// Cards per row and total cards, by grouping the top edge of each card.
async function gridShape(page: Page, section: string) {
  return page
    .locator("main section")
    .filter({ has: page.getByRole("heading", { level: 2, name: section }) })
    .evaluate((element) => {
      const tops = Array.from(element.querySelectorAll("article")).map((card) =>
        Math.round(card.getBoundingClientRect().top),
      );
      return {
        total: tops.length,
        perRow: tops.filter((top) => top === tops[0]).length,
      };
    });
}

// The page fetches its products on the server, from the real seeded backend
// that Playwright starts, so this fails if that request is rejected (a 400 for
// a parameter the backend does not accept, a 429, an outage). The page then
// swallows the error and shows the "unavailable" box instead of cards.
test("the home page shows real product cards, not the unavailable message", async ({
  page,
}) => {
  await openHome(page, 1440);

  await expect(page.getByText("temporarily unavailable")).toHaveCount(0);
  await expect(page.locator("main article")).toHaveCount(16);
});

// Photo facts the hero relies on (measured on banner-hero-wide, 1672x941): the
// garments start 47.8% across and fill about 90% of the height, so the photo
// must never be cropped in height, and the text must stay left of 47%.
const GARMENTS_LEFT_SHARE = 0.47;
const PHOTO_RATIO = 1672 / 941;

const OVERLAY_WIDTHS = [1024, 1100, 1280, 1440, 1920];
const STACKED_WIDTHS = [320, 360, 390, 768, 1023];

function luminance([r, g, b]: number[]) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: number[], b: number[]) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const parseRgb = (value: string) =>
  (value.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

test("the hero has one h1 and a decorative photo from the image optimizer", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await openHome(page, width);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(hero(page).locator("h1")).toHaveCount(1);

    const image = hero(page).locator("img");
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute("alt", "");

    const source = `${await image.getAttribute("src")} ${await image.getAttribute("srcset")}`;
    expect(source).toContain("/_next/image");
    expect(decodeURIComponent(source)).toContain("res.cloudinary.com");
    expect(decodeURIComponent(source)).toContain("banner-hero-wide");
  }
});

test("on lg and up the photo is a full 16:9 picture (never cropped) in a 560-680px hero", async ({
  page,
}) => {
  for (const width of OVERLAY_WIDTHS) {
    await openHome(page, width);
    const image = (await hero(page).locator("img").boundingBox())!;
    const section = (await hero(page).boundingBox())!;

    expect(image.width / image.height, `photo ratio at ${width}px`).toBeGreaterThan(
      PHOTO_RATIO - 0.03,
    );
    expect(image.width / image.height, `photo ratio at ${width}px`).toBeLessThan(
      PHOTO_RATIO + 0.03,
    );
    expect(section.height, `hero height at ${width}px`).toBeGreaterThanOrEqual(560);
    expect(section.height, `hero height at ${width}px`).toBeLessThanOrEqual(680);
    // Sized by height and anchored right: it ends at the hero's right edge.
    expect(Math.abs(image.x + image.width - (section.x + section.width))).toBeLessThan(
      2,
    );
  }
});

test("on lg and up the text sits left of the garments, in white, over a scrim", async ({
  page,
}) => {
  for (const width of OVERLAY_WIDTHS) {
    await openHome(page, width);
    const image = (await hero(page).locator("img").boundingBox())!;
    const garmentsLeft = image.x + image.width * GARMENTS_LEFT_SHARE;

    const copy = hero(page).locator("p, h1, a");
    const count = await copy.count();
    // eyebrow, heading, paragraph and the two buttons
    expect(count).toBe(5);
    for (let index = 0; index < count; index += 1) {
      const box = (await copy.nth(index).boundingBox())!;
      expect(
        box.x + box.width,
        `text block ${index} right edge at ${width}px`,
      ).toBeLessThanOrEqual(garmentsLeft - 16);
    }

    for (const element of [
      hero(page).locator("p").first(),
      hero(page).locator("h1"),
      hero(page).locator("p").nth(1),
    ]) {
      expect(
        await element.evaluate((node) => getComputedStyle(node).color),
        `text colour at ${width}px`,
      ).toBe("rgb(255, 255, 255)");
    }

    const scrim = await hero(page)
      .locator('div[aria-hidden="true"]')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => getComputedStyle(node).display !== "none")
          .map((node) => getComputedStyle(node).backgroundImage),
      );
    expect(scrim.length, `scrims at ${width}px`).toBe(2);
    for (const background of scrim) expect(background).toContain("linear-gradient");
  }
});

test("below lg the picture sits on top with the garments fully visible and the text below it", async ({
  page,
}) => {
  for (const width of STACKED_WIDTHS) {
    await openHome(page, width);
    const image = (await hero(page).locator("img").boundingBox())!;
    const title = (await page.locator("h1").boundingBox())!;

    // Picture first, text underneath: the text never lies on the picture.
    expect(title.y, `text below the picture at ${width}px`).toBeGreaterThanOrEqual(
      image.y + image.height,
    );
    expect(image.width).toBeGreaterThanOrEqual(width - 1);

    // The box crops the photo's left (empty) side only: object-fit cover
    // scales by height, so the visible share of the photo's width is
    // boxRatio / photoRatio, anchored right. The garments start at 47.8%.
    const visibleShare = Math.min(1, image.width / image.height / PHOTO_RATIO);
    expect(1 - visibleShare, `left crop at ${width}px`).toBeLessThan(
      GARMENTS_LEFT_SHARE - 0.02,
    );
    expect(
      await hero(page)
        .locator("img")
        .evaluate((node) => getComputedStyle(node).objectPosition),
    ).toBe("100% 50%");

    // Normal dark text on the white page, no scrim.
    expect(
      await page.locator("h1").evaluate((node) => getComputedStyle(node).color),
    ).not.toBe("rgb(255, 255, 255)");
    const visibleScrims = await hero(page)
      .locator('div[aria-hidden="true"]')
      .evaluateAll(
        (nodes) =>
          nodes.filter((node) => getComputedStyle(node).display !== "none").length,
      );
    expect(visibleScrims).toBe(0);
  }
});

test("the hero keeps one primary and one outline button, at least 44px high", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await openHome(page, width);
    const links = hero(page).getByRole("link");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText("Shop All Products");
    await expect(links.nth(1)).toHaveText("Explore Categories");
    await expect(links.nth(0)).toHaveAttribute("href", "/products");
    await expect(links.nth(1)).toHaveAttribute("href", "#categories");
    for (let index = 0; index < 2; index += 1) {
      const box = (await links.nth(index).boundingBox())!;
      expect(box.height, `button ${index} at ${width}px`).toBeGreaterThanOrEqual(44);
    }
  }
});

test("on lg and up the buttons are white-filled and white-outlined", async ({
  page,
}) => {
  await openHome(page, 1440);
  const [primary, secondary] = await hero(page)
    .getByRole("link")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return {
          background: style.backgroundColor,
          color: style.color,
          border: style.borderTopColor,
        };
      }),
    );
  expect(primary.background).toBe("rgb(255, 255, 255)");
  expect(contrast(parseRgb(primary.color), parseRgb(primary.background))).toBeGreaterThanOrEqual(7);
  expect(secondary.color).toBe("rgb(255, 255, 255)");
  expect(secondary.border).toBe("rgb(255, 255, 255)");
});

test("with the photo blocked the hero is still a dark navy panel with readable white text", async ({
  page,
}) => {
  for (const width of OVERLAY_WIDTHS) {
    await openHome(page, width);
    const background = await hero(page).evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    expect(background, `hero colour at ${width}px`).toBe("rgb(27, 36, 51)");

    for (const element of [
      hero(page).locator("p").first(),
      hero(page).locator("h1"),
      hero(page).locator("p").nth(1),
    ]) {
      const colour = await element.evaluate((node) => getComputedStyle(node).color);
      expect(
        contrast(parseRgb(colour), parseRgb(background)),
        `text on the navy at ${width}px`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});

// With the real picture loaded: hide the text, screenshot the pixels behind
// each text block, and take the lightest one. White text on that pixel is the
// worst case for the whole block. Skipped when the picture cannot be fetched
// (offline CI); the navy-panel test above covers that case.
test("white text keeps at least 4.5:1 contrast on the real photo", async ({
  page,
}) => {
  await page.unroute("**/_next/image**");
  await page.unroute("**://res.cloudinary.com/**");

  const report: string[] = [];
  for (const width of OVERLAY_WIDTHS) {
    await openHome(page, width);
    const loaded = await page
      .waitForFunction(
        () => {
          const image = document.querySelector("main section img") as HTMLImageElement | null;
          return Boolean(image && image.complete && image.naturalWidth > 0);
        },
        undefined,
        { timeout: 20_000 },
      )
      .then(() => true)
      .catch(() => false);
    test.skip(!loaded, "the hero photo could not be loaded (offline)");

    const targets = [
      ["eyebrow", hero(page).locator("p").first()],
      ["heading", hero(page).locator("h1")],
      ["paragraph", hero(page).locator("p").nth(1)],
    ] as const;
    // Hide the text itself (its box stays), so only the background is sampled.
    await hero(page)
      .locator("p, h1, a")
      .evaluateAll((nodes) =>
        nodes.forEach((node) => ((node as HTMLElement).style.visibility = "hidden")),
      );

    for (const [name, locator] of targets) {
      const box = (await locator.boundingBox())!;
      const shot = await page.screenshot({ clip: box });
      const lightest = await page.evaluate(async (base64) => {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(bitmap, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let best = [0, 0, 0];
        let bestSum = -1;
        for (let index = 0; index < data.length; index += 4) {
          const sum = data[index] + data[index + 1] + data[index + 2];
          if (sum > bestSum) {
            bestSum = sum;
            best = [data[index], data[index + 1], data[index + 2]];
          }
        }
        return best;
      }, shot.toString("base64"));

      const ratio = contrast([255, 255, 255], lightest);
      report.push(`${width}px ${name}: ${ratio.toFixed(2)}:1 (lightest pixel rgb(${lightest.join(",")}))`);
      expect(ratio, `${name} at ${width}px`).toBeGreaterThanOrEqual(4.5);
    }
  }
  console.log(`[hero contrast]\n${report.join("\n")}`);
  test.info().annotations.push({ type: "hero-contrast", description: report.join(" | ") });
});

test("the page never scrolls sideways", async ({ page }) => {
  for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
    await openHome(page, width);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth, `page width at ${width}px`).toBeLessThanOrEqual(width);
  }
});
test("on a phone the categories scroll sideways on their own, the page does not", async ({
  page,
}) => {
  await openHome(page, 390);
  const scroller = page.locator("#categories ul");
  const metrics = await scroller.evaluate((element) => {
    const before = element.scrollLeft;
    element.scrollLeft = 200;
    return {
      scrollable: element.scrollWidth > element.clientWidth,
      moved: element.scrollLeft - before,
      overflowX: getComputedStyle(element).overflowX,
      snap: getComputedStyle(element).scrollSnapType,
      page: document.documentElement.scrollWidth,
    };
  });
  expect(metrics.scrollable).toBe(true);
  expect(metrics.moved).toBeGreaterThan(0);
  expect(metrics.overflowX).toBe("auto");
  expect(metrics.snap).toContain("x");
  expect(metrics.page).toBeLessThanOrEqual(390);

  // About three quarters wide, so the next card peeks in.
  await scroller.evaluate((element) => (element.scrollLeft = 0));
  const cards = scroller.getByRole("link");
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  expect(first.width / 390).toBeGreaterThan(0.65);
  expect(first.width / 390).toBeLessThan(0.78);
  expect(second.x).toBeLessThan(390);
  expect(second.x + second.width).toBeGreaterThan(390);
});

test("five category cards sit in one row on a wide screen and no card is alone at other widths", async ({
  page,
}) => {
  const rows = async () =>
    page.locator("#categories ul > li").evaluateAll((items) => {
      const groups = new Map<number, number>();
      for (const item of items) {
        const top = Math.round(item.getBoundingClientRect().top);
        groups.set(top, (groups.get(top) ?? 0) + 1);
      }
      return [...groups.values()];
    });

  await openHome(page, 1440);
  expect(await rows()).toEqual([5]);

  await openHome(page, 1024);
  expect(await rows()).toEqual([5]);

  await openHome(page, 768);
  const tablet = await rows();
  expect(tablet.reduce((sum, count) => sum + count, 0)).toBe(5);
  expect(tablet.every((count) => count >= 2)).toBe(true);
});

test("every category card is one link named exactly like its label", async ({
  page,
}) => {
  await openHome(page, 1440);
  const section = page.locator("#categories");
  const cards = section.locator("ul > li");
  await expect(cards).toHaveCount(CATEGORY_LABELS.length);

  for (const label of CATEGORY_LABELS) {
    await expect(section.getByRole("link", { name: label, exact: true })).toHaveCount(1);
  }
  for (let index = 0; index < CATEGORY_LABELS.length; index += 1) {
    await expect(cards.nth(index).getByRole("link")).toHaveCount(1);
    // The picture is decorative: it adds nothing to the link name.
    await expect(cards.nth(index).locator("img")).toHaveAttribute("alt", "");
  }
});

test("every brand card is one link named exactly like its label", async ({
  page,
}) => {
  await openHome(page, 1440);
  for (const label of BRAND_LABELS) {
    const card = page
      .locator("main li")
      .filter({ has: page.getByRole("heading", { level: 3, name: label }) });
    await expect(card).toHaveCount(1);
    await expect(card.getByRole("link")).toHaveCount(1);
    await expect(card.getByRole("link", { name: label, exact: true })).toHaveCount(1);
    await expect(card.locator("img")).toHaveAttribute("alt", "");
  }
});

test("each product section has 8 cards in complete rows: 2 columns on a phone, 4 on a wide screen", async ({
  page,
}) => {
  for (const section of ["Featured Collection", "Everyday Essentials"]) {
    await openHome(page, 390);
    const phone = await gridShape(page, section);
    expect(phone.total, `${section} cards`).toBe(8);
    expect(phone.perRow).toBe(2);
    expect(phone.total % phone.perRow).toBe(0);

    await openHome(page, 1440);
    const wide = await gridShape(page, section);
    expect(wide.perRow).toBe(4);
    expect(wide.total % wide.perRow).toBe(0);
  }
});

test("headings never skip a level", async ({ page }) => {
  await openHome(page, 1440);
  const headings = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4"))
      .filter((heading) => heading.checkVisibility({ visibilityProperty: true }))
      .map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: (heading.textContent ?? "").trim().slice(0, 40),
      })),
  );

  expect(headings[0].level).toBe(1);
  headings.forEach((heading, index) => {
    if (index === 0) return;
    expect(
      heading.level - headings[index - 1].level,
      `"${heading.text}" (h${heading.level}) follows h${headings[index - 1].level}`,
    ).toBeLessThanOrEqual(1);
  });
});

test("the value points appear once, in one strip, and the old pillars section is gone", async ({
  page,
}) => {
  await openHome(page, 1440);
  const main = page.locator("main");

  await expect(main.getByText("Why Shop With Us")).toHaveCount(0);
  await expect(main.getByText("Practical Fashion, Built on Trust")).toHaveCount(0);
  for (const title of [
    "Current stock",
    "Prices in VND",
    "Verified reviews",
    "Secure sign-in",
  ]) {
    await expect(main.getByText(title, { exact: true })).toHaveCount(1);
  }

  const strip = main
    .locator("section")
    .filter({ has: page.getByText("Current stock", { exact: true }) });
  await expect(strip).toHaveCount(1);
  expect(await strip.locator("li").count()).toBe(4);
});

test("with every image blocked the layout stays clean", async ({ page }) => {
  for (const width of [390, 1440]) {
    await openHome(page, width);
    // Blocked pictures leave empty, neutral boxes of the right size.
    const boxes = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main img")).map((img) => {
        const box = img.parentElement!.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
    // Hero, five categories and two brands (product cards use the image-free
    // placeholder on the test seed).
    expect(boxes.length).toBe(8);
    for (const box of boxes) {
      expect(box.width).toBeGreaterThan(50);
      expect(box.height).toBeGreaterThan(30);
    }
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(width);
  }
});
