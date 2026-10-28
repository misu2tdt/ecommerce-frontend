import type { HTMLAttributes } from "react";
import { cx } from "./cx";

// The one small uppercase label that sits above a heading. Colour is not part
// of the shared string so it can change on dark backgrounds.
export const eyebrowStyles =
  "text-caption font-semibold uppercase tracking-eyebrow";

// A className that already sets a text colour replaces the default brand colour.
const HAS_TEXT_COLOUR = /(^|\s)text-(?!caption\b)/;

interface EyebrowProps extends HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div" | "h2" | "h3";
}

export function Eyebrow({ as: Tag = "p", className, ...props }: EyebrowProps) {
  return (
    <Tag
      className={cx(
        eyebrowStyles,
        !HAS_TEXT_COLOUR.test(className ?? "") && "text-brand",
        className,
      )}
      {...props}
    />
  );
}
