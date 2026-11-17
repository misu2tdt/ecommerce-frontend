import { POSITION_MAX, PRICE_MAX_VND, STOCK_MAX } from "@/lib/limits";
import { formatVnd } from "@/lib/money";

// The number fields of the admin catalog forms (price, stock, position): what
// each accepts, the message when it does not, and a way to read the backend's
// own "must not be greater than" answer as a message for the same field. Pure,
// so the actions and the tests use the same rules.

export type NumberField = "price" | "stock" | "position";
export type FieldErrors = Partial<Record<NumberField, string>>;

const FIELDS: Record<
  NumberField,
  { label: string; max: number; describeMax: (max: number) => string }
> = {
  price: { label: "Price", max: PRICE_MAX_VND, describeMax: formatVnd },
  stock: { label: "Stock", max: STOCK_MAX, describeMax: groupDigits },
  position: { label: "Position", max: POSITION_MAX, describeMax: groupDigits },
};

// 1000000 -> "1,000,000" (written by hand: only lib/dates.ts may call the
// locale formatters, see tests/unit/dates.spec.ts).
function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function maxMessage(field: NumberField): string {
  const rule = FIELDS[field];
  return `${rule.label} must be at most ${rule.describeMax(rule.max)}.`;
}

// Reads what was typed into a number field: digits only (a whole number, 0 or
// more) and not above the field's maximum.
export function parseNumberField(
  field: NumberField,
  raw: string,
): { value: number } | { error: string } {
  const rule = FIELDS[field];
  if (!/^\d+$/.test(raw.trim())) {
    return { error: `${rule.label} must be a whole number, 0 or more.` };
  }
  const value = Number(raw.trim());
  if (!Number.isSafeInteger(value)) {
    return { error: `${rule.label} must be a whole number, 0 or more.` };
  }
  if (value > rule.max) return { error: maxMessage(field) };
  return { value };
}

// The backend answers an out-of-range number with a 400 such as
// "price must not be greater than 1000000000000" (several can be joined in one
// message). This returns a message per field for the ones it recognises, or
// null when the text is about something else.
export function fieldErrorsFromBackend(message: string): FieldErrors | null {
  const found: FieldErrors = {};
  const pattern =
    /\b(price|compareAtPrice|stock|position)\s+must not be greater than\s+\d+/gi;
  for (const match of message.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    const field: NumberField = name === "compareatprice" ? "price" : (name as NumberField);
    found[field] = maxMessage(field);
  }
  return Object.keys(found).length > 0 ? found : null;
}
