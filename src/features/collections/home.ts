import { ApiError } from "@/lib/api";
import type { ProductSummary } from "@/types/catalog";
import type { Collection } from "@/types/collections";
import { getCollectionProducts, getCollections } from "./api";

// The home page's featured section: the first collection marked as featured, with
// its first products. Two full rows of four on wide screens.
export const HOME_SECTION_PRODUCTS = 8;
const CARDS_PER_ROW = 4;

// How many cards to show out of `available` products: up to 8, rounded down to a
// whole number of rows of four so no row ends with a lone card. With fewer than
// four products there is no whole row, so they are all shown.
export function homeCollectionCardCount(available: number): number {
  if (available <= 0) return 0;
  if (available < CARDS_PER_ROW) return available;
  return (
    Math.floor(Math.min(available, HOME_SECTION_PRODUCTS) / CARDS_PER_ROW) *
    CARDS_PER_ROW
  );
}

// The collections come ordered by the admin's sort order, so the first featured
// one is the one the shop wants in front.
export function pickFeaturedCollection(
  collections: readonly Collection[],
): Collection | null {
  return collections.find((collection) => collection.isFeatured) ?? null;
}

const SECOND_SECTION_HEADING = "Everyday Essentials";
const SECOND_SECTION_ALTERNATIVE_HEADING = "Wardrobe Staples";

// The heading of the home page's second product section. A collection may be
// called the same ("Everyday Essentials" is one of the sample collections); two
// sections with one name would read as a mistake, so only then the heading changes.
export function secondSectionHeading(featuredName: string | null): string {
  const same =
    featuredName !== null &&
    featuredName.trim().toLowerCase() === SECOND_SECTION_HEADING.toLowerCase();
  return same ? SECOND_SECTION_ALTERNATIVE_HEADING : SECOND_SECTION_HEADING;
}

export interface HomeFeatured {
  collection: Collection;
  products: ProductSummary[];
}

interface HomeFeaturedDependencies {
  getCollections: () => Promise<Collection[]>;
  getCollectionProducts: (
    slug: string,
    limit: number,
  ) => Promise<ProductSummary[]>;
  logError: (message: string) => void;
}

const defaults: HomeFeaturedDependencies = {
  getCollections,
  getCollectionProducts,
  logError: (message) => console.error(message),
};

// The featured collection for the home page, or null. Null means "show the
// previous featured section": there is no featured collection, or a request
// failed. A failure (an older backend without /collections answers 404, a rate
// limit 429, an outage 0 or 5xx) is logged once with its status, like the home
// page's products request; no featured collection is not a failure and logs nothing.
export async function loadHomeFeatured(
  dependencies: HomeFeaturedDependencies = defaults,
): Promise<HomeFeatured | null> {
  try {
    const collection = pickFeaturedCollection(
      await dependencies.getCollections(),
    );
    if (!collection) return null;

    const products = await dependencies.getCollectionProducts(
      collection.slug,
      HOME_SECTION_PRODUCTS,
    );
    const shown = products.slice(0, homeCollectionCardCount(products.length));
    return shown.length > 0 ? { collection, products: shown } : null;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : "unknown";
    dependencies.logError(
      `[home] could not load collections (HTTP ${status}): ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return null;
  }
}
