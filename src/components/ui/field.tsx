import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";

// Shared look of every text input, select and textarea. The border uses the
// field-border token (>= 3:1 on white) and 16px text avoids iOS zoom on focus.
const base =
  "block min-h-11 w-full rounded-md border border-field-border bg-surface px-3 py-2 text-body text-brand placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:bg-surface-muted disabled:text-neutral-500";

// Layout extras only (margin, width): never colour, radius or type.
export function fieldStyles(className?: string): string {
  return cx(base, className);
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldStyles(className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={fieldStyles(className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={fieldStyles(className)} {...props} />;
}
