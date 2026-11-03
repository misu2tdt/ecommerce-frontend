import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { pageItems } from "@/lib/pagination";

// Page links for a list. Every control is at least 44px; on a phone only
// "Previous", "Page 2 of 20" and "Next" are shown, from sm up the numbers too.
// Links do not scroll by themselves: PageFocus moves to the results afterwards.
export function Pagination({
  page,
  totalPages,
  hrefFor,
  label = "Pagination",
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const items = pageItems(page, totalPages);
  const cell = "min-w-11";
  return (
    <nav aria-label={label} className="mt-10 flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              scroll={false}
              aria-label="Previous page"
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              Previous
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={buttonStyles({
                variant: "secondary",
                size: "md",
                className: "pointer-events-none border-neutral-300 text-neutral-600",
              })}
            >
              Previous
            </span>
          )}
        </li>

        <li className="px-2 text-body-sm text-neutral-600 sm:hidden">
          Page {page} of {totalPages}
        </li>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="hidden min-w-8 justify-center text-neutral-600 sm:flex"
            >
              …
            </li>
          ) : item === page ? (
            <li key={item} className="hidden sm:block">
              <span
                aria-current="page"
                aria-label={`Page ${item}, current page`}
                className={buttonStyles({
                  variant: "primary",
                  size: "md",
                  className: cell,
                })}
              >
                {item}
              </span>
            </li>
          ) : (
            <li key={item} className="hidden sm:block">
              <Link
                href={hrefFor(item)}
                scroll={false}
                aria-label={`Page ${item}`}
                className={buttonStyles({
                  variant: "ghost",
                  size: "md",
                  className: cell,
                })}
              >
                {item}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              scroll={false}
              aria-label="Next page"
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              Next
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={buttonStyles({
                variant: "secondary",
                size: "md",
                className: "pointer-events-none border-neutral-300 text-neutral-600",
              })}
            >
              Next
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
