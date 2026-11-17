import { ID_MAX } from "./limits";

// The one parser for an id that comes from a URL or a form. It accepts only a
// whole number from 1 to ID_MAX written in digits ("7", not "07", "1.5", "1e3",
// " 7", "+7" or "-7") and returns null for anything else. A page treats null as
// "not found"; an action treats it as an invalid request. Nothing outside this
// range is ever sent to the backend.
export function parseId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  // At most 10 digits, so that Number() is exact before the range check.
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= ID_MAX ? id : null;
}

// The same for a field of a submitted form.
export function readIdField(formData: FormData, key: string): number | null {
  return parseId(formData.get(key));
}
