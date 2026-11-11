// The ordered list of product ids an admin builds for a collection. Plain
// functions that never change their input, so the picker can use them in state.

export type MoveDirection = "up" | "down";

// Adds an id at the end; an id already in the list is left where it is.
export function addProduct(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? [...ids] : [...ids, id];
}

export function removeProduct(ids: readonly number[], id: number): number[] {
  return ids.filter((entry) => entry !== id);
}

// Swaps the id with its neighbour. Moving the first up or the last down changes
// nothing, and an id that is not in the list changes nothing.
export function moveProduct(
  ids: readonly number[],
  id: number,
  direction: MoveDirection,
): number[] {
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export interface PickableProduct {
  id: number;
  name: string;
  slug: string;
  categoryName: string;
  brandName: string | null;
}

// The products that can still be added and match what was typed: every word must
// appear in the name, slug, category or brand (any case). At most `limit` are
// returned, in the order given.
export function findPickable<T extends PickableProduct>(
  products: readonly T[],
  selected: readonly number[],
  query: string,
  limit: number,
): { matches: T[]; total: number } {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const chosen = new Set(selected);
  const all = products.filter((product) => {
    if (chosen.has(product.id)) return false;
    const haystack =
      `${product.name} ${product.slug} ${product.categoryName} ${product.brandName ?? ""}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  return { matches: all.slice(0, limit), total: all.length };
}
