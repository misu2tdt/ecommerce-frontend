import type { HTMLAttributes } from "react";
import { cx } from "./cx";

// Badges and chips are the only pills in the design. Status colours are used
// for status only: green success, amber warning, red error, red sale.
export type BadgeVariant = "neutral" | "success" | "warning" | "error" | "sale";
// sm is the 12px chip; md is a 14px label for a primary status (an order's state).
export type BadgeSize = "sm" | "md";

const base = "inline-flex items-center rounded-full font-semibold";

const sizes: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.5 text-caption",
  md: "px-3 py-1 text-body-sm",
};

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-brand-soft text-neutral-700",
  success: "bg-success-soft text-success",
  warning: "bg-amber-50 text-amber-800",
  error: "bg-red-50 text-red-700",
  sale: "bg-sale text-white",
};

export function badgeStyles(
  variant: BadgeVariant = "neutral",
  className?: string,
  size: BadgeSize = "sm",
): string {
  return cx(base, sizes[size], variants[variant], className);
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({ variant, size, className, ...props }: BadgeProps) {
  return <span className={badgeStyles(variant, className, size)} {...props} />;
}
