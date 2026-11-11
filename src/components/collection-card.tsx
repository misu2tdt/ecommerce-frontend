import Link from "next/link";
import { collectionPath } from "@/features/collections/search-params";
import type { Collection } from "@/types/collections";
import { CollectionCover } from "./collection-cover";
import { Badge } from "./ui/badge";

// 1 column on a phone, 2 from sm, 3 from lg.
const COVER_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

// One collection in the grid: cover picture, name, a short description and how
// many products it holds. The name is the card's one link; its ::after stretches
// over the whole card, like the product card.
export function CollectionCard({
  collection,
  priority,
}: {
  collection: Collection;
  priority?: boolean;
}) {
  return (
    <article className="group relative">
      <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-surface-muted">
        <CollectionCover
          url={collection.heroImageUrl}
          priority={priority}
          sizes={COVER_SIZES}
        />
        {collection.isFeatured && (
          <Badge variant="neutral" className="absolute left-2 top-2">
            Featured
          </Badge>
        )}
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-1">
        <h2 className="break-words text-body font-semibold text-brand-strong">
          <Link
            href={collectionPath(collection.slug)}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
          >
            {collection.name}
          </Link>
        </h2>
        {collection.description && (
          <p className="line-clamp-2 break-words text-body-sm text-neutral-600">
            {collection.description}
          </p>
        )}
        <p className="text-body-sm font-semibold text-neutral-700">
          {collection.productCount}{" "}
          {collection.productCount === 1 ? "product" : "products"}
        </p>
      </div>
    </article>
  );
}
