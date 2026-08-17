"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/money";
import type { ProductVariant } from "@/types/catalog";

export function ProductPurchasePanel({
  variants,
}: {
  variants: ProductVariant[];
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    () => variants.find((variant) => variant.stock > 0)?.id ?? variants[0]?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  if (!selectedVariant) {
    return (
      <section
        aria-labelledby="purchase-heading"
        className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 id="purchase-heading" className="text-lg font-bold text-slate-950">
          Purchase options
        </h2>
        <p className="mt-3 text-slate-600">No active variants are available.</p>
        <button
          type="button"
          disabled
          className="mt-6 min-h-12 w-full cursor-not-allowed rounded-lg bg-slate-200 px-5 py-3 font-semibold text-slate-500"
        >
          Unavailable
        </button>
      </section>
    );
  }

  const available = selectedVariant.stock > 0;
  const attributes = Object.entries(selectedVariant.attributes);

  function selectVariant(variantId: number) {
    setSelectedVariantId(variantId);
    setQuantity(1);
  }

  function updateQuantity(value: number) {
    if (!available || !Number.isFinite(value)) return;
    setQuantity(Math.min(selectedVariant.stock, Math.max(1, value)));
  }

  return (
    <section
      aria-labelledby="purchase-heading"
      className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Selected price</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-900">
            {formatVnd(selectedVariant.price)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            available
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-600"
          }`}
          role="status"
        >
          {available ? `${selectedVariant.stock} in stock` : "Out of stock"}
        </span>
      </div>

      <div className="mt-6">
        <h2 id="purchase-heading" className="font-bold text-slate-950">
          Choose a variant
        </h2>
        <div
          className="mt-3 grid gap-3 sm:grid-cols-2"
          role="group"
          aria-label="Product variants"
        >
          {variants.map((variant) => {
            const selected = variant.id === selectedVariant.id;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => selectVariant(variant.id)}
                aria-pressed={selected}
                className={`min-h-20 rounded-lg border-2 px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${
                  selected
                    ? "border-emerald-700 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-400"
                } ${variant.stock === 0 ? "text-slate-500" : "text-slate-900"}`}
              >
                <span className="block font-semibold">{variant.name}</span>
                <span className="mt-1 block text-sm">
                  {formatVnd(variant.price)} -{" "}
                  {variant.stock > 0
                    ? `${variant.stock} available`
                    : "Out of stock"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-bold text-slate-950">{selectedVariant.name}</h3>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            SKU {selectedVariant.sku}
          </p>
        </div>

        {attributes.length > 0 ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {attributes.map(([key, value]) => (
              <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {formatAttributeLabel(key)}
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            This variant has no additional attributes.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <label htmlFor="quantity" className="font-bold text-slate-950">
          Quantity
        </label>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            disabled={!available || quantity <= 1}
            aria-label="Decrease quantity"
            className="h-11 w-11 rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            -
          </button>
          <input
            id="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, selectedVariant.stock)}
            value={quantity}
            onChange={(event) => updateQuantity(Number(event.target.value))}
            disabled={!available}
            className="h-11 w-20 rounded-lg border border-slate-300 bg-white px-2 text-center font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            disabled={!available || quantity >= selectedVariant.stock}
            aria-label="Increase quantity"
            className="h-11 w-11 rounded-lg border border-slate-300 bg-white text-xl font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            +
          </button>
          <span className="ml-2 text-sm text-slate-500">
            {available ? `Maximum ${selectedVariant.stock}` : "Unavailable"}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled
        aria-describedby="purchase-note"
        className="mt-6 min-h-12 w-full cursor-not-allowed rounded-lg bg-slate-200 px-5 py-3 font-semibold text-slate-500"
      >
        {available ? "Add to cart in Phase 4E" : "Unavailable"}
      </button>
      <p id="purchase-note" className="mt-2 text-center text-xs text-slate-500">
        Cart actions are not enabled yet.
      </p>
    </section>
  );
}

function formatAttributeLabel(key: string): string {
  const label = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
