import type { ReactNode } from "react";
import { cx } from "./ui/cx";

// 2 columns on phones, 4 on wide screens: the card is designed for ~160px up.
//  - "catalog": 3 columns from lg (a sidebar shares the row), 4 from xl
//  - "home": 4 columns from lg, so 8 products make two full rows
const COLUMNS = {
  catalog: "lg:grid-cols-3 xl:grid-cols-4",
  home: "lg:grid-cols-4",
} as const;

export function ProductGrid({
  children,
  className,
  variant = "catalog",
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof COLUMNS;
}) {
  return (
    <div
      className={cx(
        "grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4",
        COLUMNS[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
