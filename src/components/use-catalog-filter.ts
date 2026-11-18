"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  catalogHrefFor,
  type ParamsEdit,
} from "@/features/catalog/filter-edits";
import { announceNavigation } from "@/lib/navigation-progress";

// How a catalog control changes the address. Used by the desktop filter bar, the
// filter list in the phone drawer and the chips of the active filters: each gives
// an edit (see features/catalog/filter-edits.ts) and the page is asked again for
// the new address, with the page number dropped.
export function useCatalogFilterUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const apply = (edit: ParamsEdit) => {
    const href = catalogHrefFor(searchParams, edit);
    announceNavigation(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return { isPending, apply };
}

// The two price boxes. They show what is typed; until something is typed they show
// the price in the address, and they go back to it whenever the address changes
// (adjusted while rendering, so there is never a frame with the old price).
export function usePriceDraft(minPrice?: number, maxPrice?: number) {
  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);
  const [seenMin, setSeenMin] = useState(minPrice);
  const [seenMax, setSeenMax] = useState(maxPrice);

  if (minPrice !== seenMin) {
    setSeenMin(minPrice);
    setMinDraft(null);
  }
  if (maxPrice !== seenMax) {
    setSeenMax(maxPrice);
    setMaxDraft(null);
  }

  return {
    min: minDraft ?? (minPrice !== undefined ? String(minPrice) : ""),
    max: maxDraft ?? (maxPrice !== undefined ? String(maxPrice) : ""),
    setMin: setMinDraft,
    setMax: setMaxDraft,
    reset: () => {
      setMinDraft(null);
      setMaxDraft(null);
    },
  };
}
