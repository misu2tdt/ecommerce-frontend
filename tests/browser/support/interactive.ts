import type { Page } from "@playwright/test";

// Waits until React has taken over the element: before that, a click is an
// ordinary browser action (a link is followed, a form is submitted) and not what
// the page's own code would do. React marks every element it has hydrated.
export async function waitUntilInteractive(page: Page, selector: string) {
  await page.waitForFunction(
    (css) => {
      const element = document.querySelector(css);
      return (
        element !== null &&
        Object.keys(element).some((key) => key.startsWith("__reactProps$"))
      );
    },
    selector,
  );
}
