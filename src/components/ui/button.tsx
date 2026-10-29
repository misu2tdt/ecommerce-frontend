import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "heroPrimary"
  | "heroSecondary";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong focus-visible:outline-brand disabled:bg-neutral-200 disabled:text-neutral-600",
  secondary:
    "border border-brand bg-surface text-brand hover:bg-brand-soft focus-visible:outline-brand disabled:border-neutral-300 disabled:text-neutral-600",
  ghost:
    "text-brand hover:bg-brand-soft focus-visible:outline-brand disabled:text-neutral-600",
  danger:
    "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700 disabled:bg-neutral-200 disabled:text-neutral-600",
  // The home hero's buttons. They look like primary and secondary on the white
  // page, and turn light (white fill / white outline) from lg, where the hero
  // text sits on the dark photo.
  heroPrimary:
    "bg-brand text-white hover:bg-brand-strong focus-visible:outline-brand lg:bg-white lg:text-brand-strong lg:hover:bg-neutral-100 lg:focus-visible:outline-white",
  heroSecondary:
    "border border-brand bg-surface text-brand hover:bg-brand-soft focus-visible:outline-brand lg:border-white lg:bg-transparent lg:text-white lg:hover:bg-white/10 lg:focus-visible:outline-white",
};

// Every size is at least 44px tall, the minimum comfortable touch target.
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-body-sm",
  md: "min-h-11 px-5 text-body-sm",
  lg: "min-h-12 px-6 text-body",
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  // Layout extras only (margin, width): never colour, radius or type.
  className?: string;
}

// Class helper for anything that looks like a button, including next/link:
//   <Link href="/cart" className={buttonStyles({ variant: "secondary" })}>
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cx(base, variants[variant], sizes[size], className);
}

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<ButtonStyleOptions, "className"> {}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
