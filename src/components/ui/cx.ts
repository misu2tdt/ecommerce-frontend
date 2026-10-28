// Joins class names, skipping empty values. Layout extras only: the primitives
// never rely on a later class overriding an earlier one.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
