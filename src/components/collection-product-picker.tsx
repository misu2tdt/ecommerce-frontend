"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { saveCollectionProductsAction } from "@/features/collections/admin-actions";
import { COLLECTION_MAX_PRODUCTS } from "@/lib/collection-form";
import {
  addProduct,
  findPickable,
  moveProduct,
  removeProduct,
  sameOrder,
  type MoveDirection,
  type PickableProduct,
} from "@/lib/collection-order";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";

// A product of the catalog the admin can choose from.
export interface CatalogChoice extends PickableProduct {
  status: "active" | "inactive";
}

// How many search results are listed at once; typing narrows the rest.
const RESULT_LIMIT = 30;

const rowButton =
  "min-h-11 rounded-md border border-field-border bg-surface px-3 text-body-sm font-semibold text-neutral-800 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-neutral-500 disabled:hover:bg-surface";

// Builds the ordered product list of a collection: search the catalog, add
// products, reorder them with "Move up" and "Move down", remove them, then Save,
// which replaces the collection's products in one step.
export function CollectionProductPicker({
  collectionId,
  catalog,
  initialIds,
}: {
  collectionId: number;
  catalog: CatalogChoice[];
  // The saved list, in display order.
  initialIds: number[];
}) {
  const searchId = useId();
  const [selected, setSelected] = useState<number[]>(initialIds);
  const [saved, setSaved] = useState<number[]>(initialIds);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog],
  );
  const { matches, total } = useMemo(
    () => findPickable(catalog, selected, query, RESULT_LIMIT),
    [catalog, selected, query],
  );
  const dirty = !sameOrder(selected, saved);
  const full = selected.length >= COLLECTION_MAX_PRODUCTS;

  function name(id: number) {
    return byId.get(id)?.name ?? `Product ${id}`;
  }

  function add(product: CatalogChoice) {
    setSelected((current) => addProduct(current, product.id));
    setAnnouncement(`${product.name} added at position ${selected.length + 1}.`);
    setResult(null);
  }

  function remove(id: number) {
    setSelected((current) => removeProduct(current, id));
    setAnnouncement(`${name(id)} removed.`);
    setResult(null);
  }

  function move(id: number, direction: MoveDirection) {
    const next = moveProduct(selected, id, direction);
    setSelected(next);
    setAnnouncement(`${name(id)} moved to position ${next.indexOf(id) + 1} of ${next.length}.`);
    setResult(null);
  }

  function save() {
    startTransition(async () => {
      const outcome = await saveCollectionProductsAction(collectionId, selected);
      if (outcome.status === "success" && outcome.products) {
        // What the backend stored is the new saved state.
        const ids = outcome.products.map((product) => product.id);
        setSelected(ids);
        setSaved(ids);
      }
      setResult({
        status: outcome.status === "success" ? "success" : "error",
        message: outcome.message ?? "Unable to save the products.",
      });
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Search the catalog and add products */}
      <section aria-labelledby={`${searchId}-title`} className="min-w-0">
        <h4 id={`${searchId}-title`} className="text-title font-bold text-brand-strong">
          Add products
        </h4>
        <label htmlFor={searchId} className="mt-4 block text-body-sm font-semibold text-neutral-800">
          Search products
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, category or brand"
          className={fieldStyles("mt-2")}
        />
        <p className="mt-2 text-body-sm text-neutral-600" role="status">
          {total === 0
            ? query.trim()
              ? "No products match this search."
              : "Every product is already in this collection."
            : total > matches.length
              ? `Showing ${matches.length} of ${total} products. Type to narrow the list.`
              : `${total} ${total === 1 ? "product" : "products"} available.`}
        </p>
        {full && (
          <p className="mt-2 text-body-sm font-semibold text-amber-800">
            A collection can hold at most {COLLECTION_MAX_PRODUCTS} products.
          </p>
        )}
        <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
          {matches.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-brand-strong">{product.name}</p>
                <p className="break-words text-body-sm text-neutral-600">
                  {product.categoryName}
                  {product.brandName ? ` / ${product.brandName}` : ""}
                  {product.status === "inactive" ? " · Inactive" : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={full}
                onClick={() => add(product)}
                aria-label={`Add ${product.name}`}
                className={`${rowButton} shrink-0`}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* The ordered list */}
      <section aria-labelledby={`${searchId}-list`} className="min-w-0">
        <h4 id={`${searchId}-list`} className="text-title font-bold text-brand-strong">
          Products in this collection ({selected.length})
        </h4>
        <p className="mt-2 text-body-sm text-neutral-600">
          Shoppers see them in this order. Inactive products stay hidden from shoppers until they are active.
        </p>

        {selected.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-field-border bg-surface p-6 text-center text-neutral-600">
            No products yet. Add some from the list.
          </p>
        ) : (
          <ol aria-label="Products in this collection" className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
            {selected.map((id, index) => {
              const product = byId.get(id);
              return (
                <li key={id} className="p-3">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="w-6 shrink-0 pt-0.5 text-right font-semibold text-neutral-600">
                      {index + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-brand-strong">{name(id)}</p>
                      {product?.status === "inactive" && (
                        <Badge variant="neutral" className="mt-1">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 pl-9">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(id, "up")}
                      aria-label={`Move up: ${name(id)}`}
                      className={rowButton}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      disabled={index === selected.length - 1}
                      onClick={() => move(id, "down")}
                      aria-label={`Move down: ${name(id)}`}
                      className={rowButton}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      aria-label={`Remove ${name(id)}`}
                      className={rowButton}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Announces moves and removals to screen readers */}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        <div className="mt-4">
          {result && (
            <p
              role={result.status === "error" ? "alert" : "status"}
              className={`mb-4 rounded-md border px-4 py-3 text-body-sm ${
                result.status === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-success/30 bg-success-soft text-success"
              }`}
            >
              {result.message}
            </p>
          )}
          {dirty && !pending && (
            <p className="mb-3 text-body-sm font-semibold text-amber-800">
              You have unsaved changes.
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            {pending ? "Saving..." : "Save products"}
          </button>
        </div>
      </section>
    </div>
  );
}
