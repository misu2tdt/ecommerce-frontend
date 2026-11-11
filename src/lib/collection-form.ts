import type { CreateCollectionInput } from "@/types/collections";

// What an admin may type into the collection form, checked before it is sent
// (the backend checks it again). The limits are the backend's: see
// CreateCollectionDto and ReplaceCollectionProductsDto in the backend repo.

export const COLLECTION_NAME_MIN = 2;
export const COLLECTION_NAME_MAX = 120;
export const COLLECTION_SLUG_MAX = 160;
export const COLLECTION_DESCRIPTION_MAX = 2000;
export const COLLECTION_IMAGE_URL_MAX = 2048;
export const COLLECTION_SORT_ORDER_MAX = 100_000;
export const COLLECTION_MAX_PRODUCTS = 200;

// Lowercase letters and numbers joined by single dashes.
export const COLLECTION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type FormSource = { get(name: string): unknown };

export type ParsedCollectionForm =
  | { ok: true; input: CreateCollectionInput }
  | { ok: false; message: string };

// 2000 -> "2,000" (a plain number in a message, not a date or a locale format).
function withCommas(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function text(source: FormSource, name: string): string {
  const value = source.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isHttpAddress(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Reads the create or edit form. On create an empty optional field is left out
// (the backend uses its defaults); on edit an empty description or cover picture
// clears it, and an empty slug means "keep the address".
export function parseCollectionForm(
  source: FormSource,
  mode: "create" | "edit",
): ParsedCollectionForm {
  const name = text(source, "name");
  if (name.length < COLLECTION_NAME_MIN || name.length > COLLECTION_NAME_MAX) {
    return {
      ok: false,
      message: `Name must be between ${COLLECTION_NAME_MIN} and ${COLLECTION_NAME_MAX} characters.`,
    };
  }

  const slug = text(source, "slug").toLowerCase();
  if (
    slug &&
    (slug.length > COLLECTION_SLUG_MAX || !COLLECTION_SLUG_PATTERN.test(slug))
  ) {
    return {
      ok: false,
      message:
        "The address may only contain lowercase letters and numbers joined by single dashes, for example summer-picks.",
    };
  }

  const description = text(source, "description");
  if (description.length > COLLECTION_DESCRIPTION_MAX) {
    return {
      ok: false,
      message: `Description must be at most ${withCommas(COLLECTION_DESCRIPTION_MAX)} characters.`,
    };
  }

  const heroImageUrl = text(source, "heroImageUrl");
  if (
    heroImageUrl &&
    (heroImageUrl.length > COLLECTION_IMAGE_URL_MAX || !isHttpAddress(heroImageUrl))
  ) {
    return {
      ok: false,
      message: "The cover image must be a full http or https address.",
    };
  }

  const rawSortOrder = text(source, "sortOrder");
  let sortOrder = 0;
  if (rawSortOrder) {
    sortOrder = /^\d+$/.test(rawSortOrder) ? Number(rawSortOrder) : NaN;
    if (!Number.isSafeInteger(sortOrder) || sortOrder > COLLECTION_SORT_ORDER_MAX) {
      return {
        ok: false,
        message: `Sort order must be a whole number from 0 to ${withCommas(COLLECTION_SORT_ORDER_MAX)}.`,
      };
    }
  }

  const input: CreateCollectionInput = {
    name,
    ...(slug ? { slug } : {}),
    isFeatured: source.get("isFeatured") === "on",
    sortOrder,
  };
  if (mode === "create") {
    input.isActive = source.get("isActive") === "on";
    if (description) input.description = description;
    if (heroImageUrl) input.heroImageUrl = heroImageUrl;
  } else {
    input.description = description || null;
    input.heroImageUrl = heroImageUrl || null;
  }
  return { ok: true, input };
}

export type ParsedProductIds =
  | { ok: true; ids: number[] }
  | { ok: false; message: string };

// The ordered product ids of a collection: whole numbers from 1, no repeats, at
// most 200. An empty list is allowed (it empties the collection).
export function parseProductIds(value: unknown): ParsedProductIds {
  if (
    !Array.isArray(value) ||
    !value.every((id) => Number.isSafeInteger(id) && id >= 1)
  ) {
    return { ok: false, message: "The product list is invalid. Reload the page and try again." };
  }
  if (value.length > COLLECTION_MAX_PRODUCTS) {
    return {
      ok: false,
      message: `A collection can hold at most ${COLLECTION_MAX_PRODUCTS} products.`,
    };
  }
  if (new Set(value).size !== value.length) {
    return {
      ok: false,
      message: "A product appears more than once in the list. Remove the repeat and save again.",
    };
  }
  return { ok: true, ids: value as number[] };
}
