"use client";

import { useActionState, useId } from "react";
import {
  createCollectionAction,
  updateCollectionAction,
  type CollectionActionState,
} from "@/features/collections/admin-actions";
import {
  COLLECTION_DESCRIPTION_MAX,
  COLLECTION_NAME_MAX,
  COLLECTION_SLUG_MAX,
  COLLECTION_SORT_ORDER_MAX,
} from "@/lib/collection-form";
import type { AdminCollection } from "@/types/collections";
import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";

const INITIAL_STATE: CollectionActionState = {};
const labelClass = "text-body-sm font-semibold text-neutral-800";
const hintClass = "mt-1 text-body-sm text-neutral-600";

// Create (no `collection`) or edit the details of a collection: name, address,
// description, cover picture, featured flag and sort order. Its products are
// chosen separately (see CollectionProductPicker).
export function CollectionForm({ collection }: { collection?: AdminCollection }) {
  const [state, action, pending] = useActionState(
    collection ? updateCollectionAction : createCollectionAction,
    INITIAL_STATE,
  );
  const ids = {
    name: useId(),
    slug: useId(),
    description: useId(),
    image: useId(),
    sort: useId(),
  };

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      {collection && <input type="hidden" name="id" value={collection.id} />}

      <div className="sm:col-span-2">
        <label htmlFor={ids.name} className={labelClass}>
          Name
        </label>
        <input
          id={ids.name}
          name="name"
          required
          minLength={2}
          maxLength={COLLECTION_NAME_MAX}
          defaultValue={collection?.name}
          className={fieldStyles("mt-2")}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={ids.slug} className={labelClass}>
          {collection ? "Address" : "Address (optional)"}
        </label>
        <input
          id={ids.slug}
          name="slug"
          maxLength={COLLECTION_SLUG_MAX}
          defaultValue={collection?.slug}
          placeholder="summer-picks"
          aria-describedby={`${ids.slug}-hint`}
          className={fieldStyles("mt-2")}
        />
        <p id={`${ids.slug}-hint`} className={hintClass}>
          {collection
            ? "Shown in the web address of the collection page. Changing it changes that address."
            : "Made from the name when left empty. Lowercase letters and numbers joined by single dashes."}
        </p>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={ids.description} className={labelClass}>
          Description
        </label>
        <textarea
          id={ids.description}
          name="description"
          rows={3}
          maxLength={COLLECTION_DESCRIPTION_MAX}
          defaultValue={collection?.description ?? ""}
          className={fieldStyles("mt-2 py-3")}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={ids.image} className={labelClass}>
          Cover image address (optional)
        </label>
        <input
          id={ids.image}
          name="heroImageUrl"
          type="url"
          inputMode="url"
          defaultValue={collection?.heroImageUrl ?? ""}
          placeholder="https://"
          className={fieldStyles("mt-2")}
        />
      </div>

      <div>
        <label htmlFor={ids.sort} className={labelClass}>
          Sort order
        </label>
        <input
          id={ids.sort}
          name="sortOrder"
          type="number"
          min={0}
          max={COLLECTION_SORT_ORDER_MAX}
          step={1}
          defaultValue={collection?.sortOrder ?? 0}
          aria-describedby={`${ids.sort}-hint`}
          className={fieldStyles("mt-2")}
        />
        <p id={`${ids.sort}-hint`} className={hintClass}>
          Lower numbers come first in the list of collections.
        </p>
      </div>

      <div className="flex flex-col justify-end gap-3 self-end">
        <label className="flex min-h-11 items-center gap-3 rounded-md border border-line px-4 py-2">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={collection?.isFeatured ?? false}
            className="h-5 w-5 accent-brand"
          />
          <span className={labelClass}>Featured on the home page</span>
        </label>
        {!collection && (
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-line px-4 py-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked
              className="h-5 w-5 accent-brand"
            />
            <span className={labelClass}>Active</span>
          </label>
        )}
      </div>

      <div className="sm:col-span-2">
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`mb-4 rounded-md border px-4 py-3 text-body-sm ${
              state.status === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-success/30 bg-success-soft text-success"
            }`}
          >
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          {pending
            ? "Saving..."
            : collection
              ? "Save details"
              : "Create collection"}
        </button>
      </div>
    </form>
  );
}
