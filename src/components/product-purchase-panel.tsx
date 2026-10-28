"use client";

import Link from "next/link";
import { useActionState, useId, useMemo, useRef, useState } from "react";
import { addToCartAction, type CartActionState } from "@/features/cart/actions";
import { formatVnd } from "@/lib/money";
import {
  clampQuantity,
  determineSelectorMode,
  formatVariantSecondaryLabel,
  getInitialSelection,
  reconcileSelectionOnColorChange,
  resolveVariant,
} from "@/lib/variant-selection";
import type { ProductVariant } from "@/types/catalog";
import { ProductAccordions } from "./product-accordions";
import { SizeGuideModal } from "./size-guide-modal";
import { WishlistSaveControl } from "./wishlist-save-control";

import { buttonStyles } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Badge } from "@/components/ui/badge";
interface ProductPurchasePanelProps {
  productId: number;
  productName: string;
  variants: ProductVariant[];
  returnPath: string;
  categoryName?: string;
  brandName?: string | null;
  description: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}

const INITIAL_CART_STATE: CartActionState = {};

export function ProductPurchasePanel({
  productId,
  productName,
  variants,
  returnPath,
  categoryName = "Everyday Fashion",
  brandName,
  description,
  minPrice,
  maxPrice,
}: ProductPurchasePanelProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Deterministic selector configuration
  const options = useMemo(() => determineSelectorMode(variants), [variants]);

  // Initial selection state (multi-size apparel starts with size = null)
  const [selectedColor, setSelectedColor] = useState<string | null>(
    () => getInitialSelection(variants, options).color,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    () => getInitialSelection(variants, options).size,
  );
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    () => getInitialSelection(variants, options).variantId,
  );
  const [quantity, setQuantity] = useState(1);

  // Resolve active ProductVariant with ZERO unsafe fallbacks
  const selectedVariant = useMemo(() => {
    return resolveVariant(variants, options.mode, {
      color: selectedColor,
      size: selectedSize,
      variantId: selectedVariantId,
    });
  }, [variants, options.mode, selectedColor, selectedSize, selectedVariantId]);

  // Handle color change with deliberate size reconciliation
  const handleColorChange = (newColor: string) => {
    const reconciledSize = reconcileSelectionOnColorChange(
      variants,
      newColor,
      selectedSize,
      options,
    );
    setSelectedColor(newColor);
    setSelectedSize(reconciledSize);
  };

  // Safe quantity calculation
  const maxStock = selectedVariant ? selectedVariant.stock : 0;
  const currentQuantity = selectedVariant && maxStock > 0 ? clampQuantity(quantity, maxStock) : 1;

  const handleQuantityChange = (delta: number) => {
    if (!selectedVariant || maxStock <= 0) return;
    const nextVal = currentQuantity + delta;
    if (nextVal >= 1 && nextVal <= maxStock) {
      setQuantity(nextVal);
    }
  };

  // Cart Form Action
  const [state, formAction, pending] = useActionState(
    addToCartAction,
    INITIAL_CART_STATE,
  );

  // Compute price display
  const priceDisplay = useMemo(() => {
    if (selectedVariant) {
      return formatVnd(selectedVariant.price);
    }
    const prices = variants.map((v) => v.price);
    const low = minPrice ?? (prices.length ? Math.min(...prices) : 0);
    const high = maxPrice ?? (prices.length ? Math.max(...prices) : 0);
    if (low === high || high === 0) {
      return formatVnd(low);
    }
    return `${formatVnd(low)} – ${formatVnd(high)}`;
  }, [selectedVariant, variants, minPrice, maxPrice]);

  // Compute compare-at price & discount percent
  const compareAtInfo = useMemo(() => {
    if (selectedVariant) {
      if (
        selectedVariant.compareAtPrice &&
        selectedVariant.compareAtPrice > selectedVariant.price
      ) {
        const percent = Math.round(
          (1 - selectedVariant.price / selectedVariant.compareAtPrice) * 100,
        );
        return {
          type: "exact" as const,
          compareAtDisplay: formatVnd(selectedVariant.compareAtPrice),
          percent,
        };
      }
      return null;
    }
    const hasDiscount = variants.some(
      (v) => v.compareAtPrice && v.compareAtPrice > v.price,
    );
    if (hasDiscount) {
      return {
        type: "options" as const,
      };
    }
    return null;
  }, [selectedVariant, variants]);

  const isPurchasable = selectedVariant !== null && selectedVariant.stock > 0;

  // Determine purchase button label
  const purchaseButtonLabel = useMemo(() => {
    if (pending) return "Adding to Bag...";
    if (selectedVariant === null) {
      if (options.mode === "color_size" && !selectedSize) return "Select a Size";
      if (options.mode === "size_only" && !selectedSize) return "Select a Size";
      if (options.mode === "generic" && selectedVariantId === null) return "Select an Option";
      return "Unavailable";
    }
    if (selectedVariant.stock === 0) return "Out of Stock";
    return "Add to Bag";
  }, [pending, selectedVariant, options.mode, selectedSize, selectedVariantId]);

  // Is size guide appropriate for this category?
  const isApparelCategory =
    categoryName.toLowerCase().includes("top") ||
    categoryName.toLowerCase().includes("shirt") ||
    categoryName.toLowerCase().includes("tee") ||
    categoryName.toLowerCase().includes("polo") ||
    categoryName.toLowerCase().includes("hoodie") ||
    categoryName.toLowerCase().includes("pant") ||
    categoryName.toLowerCase().includes("short") ||
    categoryName.toLowerCase().includes("outerwear");

  const showSizeGuideAffordance = isApparelCategory && options.hasMultipleSizes;

  return (
    <section aria-labelledby="purchase-heading" className="flex flex-col">
      {/* Price & Stock Overview */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-5">
        <div>
          <span className="text-body-sm font-semibold text-neutral-600">
            {selectedVariant ? "Selected Price" : "Price Range"}
          </span>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <p
              className={`text-heading font-bold tracking-tight ${
                compareAtInfo?.type === "exact" ? "text-sale" : "text-brand-strong"
              }`}
            >
              {priceDisplay}
            </p>
            {compareAtInfo?.type === "exact" && (
              <>
                <span className="text-body text-neutral-500 line-through">
                  {compareAtInfo.compareAtDisplay}
                </span>
                <Badge variant="sale" size="md">-{compareAtInfo.percent}%</Badge>
              </>
            )}
            {compareAtInfo?.type === "options" && (
              <Badge variant="sale" size="md">Sale options</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedVariant ? (
            <>
              <Badge
                variant={selectedVariant.stock > 0 ? "success" : "error"}
                size="md"
                role="status"
              >
                <span
                  className={`mr-1.5 h-2 w-2 rounded-full ${
                    selectedVariant.stock > 0 ? "bg-success" : "bg-red-600"
                  }`}
                />
                {selectedVariant.stock > 0
                  ? `${selectedVariant.stock} in stock`
                  : "Out of stock"}
              </Badge>
              <span className="font-mono text-body-sm text-neutral-500">
                SKU: {selectedVariant.sku}
              </span>
            </>
          ) : (
            <Badge variant="neutral" size="md" role="status">
              {options.hasMultipleSizes && !selectedSize
                ? "Select a size for availability"
                : "Select an option"}
            </Badge>
          )}
        </div>
      </div>

      {/* Variant Selection Header */}
      <Eyebrow as="h2"
        id="purchase-heading" className="mt-5">
        Choose a variant
      </Eyebrow>

      {/* 1. Color Selector (Regular Mode) */}
      {(options.mode === "color_size" || options.mode === "color_only") && options.colors.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-bold text-brand">
              Color: <span className="font-semibold text-brand">{selectedColor ?? "Choose a color"}</span>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2.5" aria-label="Available colors">
            {options.colors.map((color) => {
              const isSelected = color === selectedColor;
              const hasInStock = variants.some(
                (v) => v.attributes?.color === color && v.stock > 0,
              );

              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleColorChange(color)}
                  className={`relative flex items-center gap-2 rounded-md border-2 px-4 py-2.5 text-body-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    isSelected
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-line bg-surface text-neutral-700 hover:border-neutral-400 hover:bg-surface-muted"
                  } ${!hasInStock ? "opacity-60" : ""}`}
                >
                  <span>{color}</span>
                  {!hasInStock && (
                    <Eyebrow as="span" className="text-neutral-600">
                      (Sold out)
                    </Eyebrow>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Size Selector (Regular Mode) */}
      {(options.mode === "color_size" || options.mode === "size_only") && options.sizes.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-bold text-brand">
              Size:{" "}
              {selectedSize ? (
                <span className="font-semibold text-brand">{selectedSize}</span>
              ) : (
                <span className="font-normal text-amber-700">Please select</span>
              )}
            </label>

            {showSizeGuideAffordance && (
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-body-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
              >
                Size & fit guide
              </button>
            )}
          </div>

          <div
            className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4"
            aria-label="Available sizes"
          >
            {options.sizes.map((size) => {
              const isSelected = size === selectedSize;
              const matchingVariant = variants.find(
                (v) =>
                  (options.mode === "size_only" || v.attributes?.color === selectedColor) &&
                  v.attributes?.size === size,
              );

              const exists = Boolean(matchingVariant);
              const inStock = matchingVariant ? matchingVariant.stock > 0 : false;

              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={!exists}
                  onClick={() => exists && setSelectedSize(size)}
                  className={`relative flex min-h-12 flex-col items-center justify-center rounded-md border-2 px-3 py-2 text-center text-body-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    !exists
                      ? "cursor-not-allowed border-neutral-100 bg-surface-muted text-neutral-300 line-through"
                      : isSelected
                        ? "border-brand bg-brand-soft text-brand-strong"
                        : inStock
                          ? "border-line bg-surface text-neutral-800 hover:border-neutral-400 hover:bg-surface-muted"
                          : "border-line bg-surface-muted text-neutral-600 hover:border-field-border"
                  }`}
                >
                  <span>{size}</span>
                  {exists && !inStock && (
                    <Eyebrow as="span" className="text-neutral-600">
                      Out of stock
                    </Eyebrow>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Generic / Concrete Variant Selector (When attributes are irregular/mixed) */}
      {options.mode === "generic" && variants.length > 1 && (
        <div className="mt-6">
          <label className="text-body-sm font-bold text-brand">
            Select Option:{" "}
            {selectedVariant ? (
              <span className="font-semibold text-brand">{selectedVariant.name}</span>
            ) : (
              <span className="font-normal text-amber-700">Please select</span>
            )}
          </label>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2" aria-label="Available options">
            {variants.map((v) => {
              const isSelected = v.id === selectedVariantId;
              const inStock = v.stock > 0;
              const secondaryLabel = formatVariantSecondaryLabel(v);

              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`rounded-md border-2 p-3 text-left transition focus-visible:outline-2 focus-visible:outline-brand ${
                    isSelected
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-line bg-surface text-neutral-800 hover:border-field-border"
                  }`}
                >
                  <p className="font-semibold text-brand-strong">{v.name}</p>
                  <p className="mt-0.5 text-body-sm font-normal text-neutral-600">
                    {secondaryLabel}
                  </p>
                  <p className="mt-1 text-body-sm text-neutral-600">
                    {formatVnd(v.price)} — {inStock ? `${v.stock} in stock` : "Out of stock"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Single Variant Confirmation (when only 1 option exists) */}
      {options.mode === "single" && variants.length === 1 && (
        <div className="mt-4 text-body-sm text-neutral-600">
          Standard single size configuration.
        </div>
      )}

      {/* 5. Quantity Selector & Purchase Actions Form */}
      <form
        id={formId}
        ref={formRef}
        action={formAction}
        className="mt-8 space-y-4"
      >
        {selectedVariant && (
          <>
            <input type="hidden" name="variantId" value={selectedVariant.id} />
            <input type="hidden" name="quantity" value={currentQuantity} />
          </>
        )}
        <input type="hidden" name="returnPath" value={returnPath} />

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quantity-input" className="uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
              Quantity
            </label>
            <div className="flex items-center rounded-md border border-field-border bg-surface">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                disabled={!isPurchasable || currentQuantity <= 1 || pending}
                aria-label="Decrease quantity"
                className="flex h-11 w-11 items-center justify-center rounded-l-md text-title font-bold text-neutral-700 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                −
              </button>
              <input
                id="quantity-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(1, maxStock)}
                value={currentQuantity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val) && maxStock > 0) {
                    setQuantity(Math.min(maxStock, Math.max(1, val)));
                  }
                }}
                disabled={!isPurchasable || pending}
                className="h-11 w-14 text-center font-bold text-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:bg-surface-muted"
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                disabled={!isPurchasable || currentQuantity >= maxStock || pending}
                aria-label="Increase quantity"
                className="flex h-11 w-11 items-center justify-center rounded-r-md text-title font-bold text-neutral-700 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex-1 pt-5">
            <button
              type="submit"
              disabled={!isPurchasable || pending}
              className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <span>{purchaseButtonLabel}</span>
            </button>
          </div>
        </div>

        {/* Status Feedback Message */}
        {state.message && (
          <div
            role={state.status === "error" ? "alert" : "status"}
            className={`mt-4 flex items-center justify-between rounded-md border px-4 py-3 text-body-sm font-semibold ${
              state.status === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-success/30 bg-success-soft text-success"
            }`}
          >
            <span>{state.message}</span>
            {state.status === "success" && (
              <Link
                href="/cart"
                className="font-bold underline underline-offset-2 hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-brand"
              >
                View Bag →
              </Link>
            )}
          </div>
        )}
      </form>

      {/* Wishlist Affordance */}
      <div className="mt-4">
        <WishlistSaveControl
          productId={productId}
          productName={productName}
          returnPath={returnPath}
        />
      </div>

      {/* Product Accordions / Information */}
      <ProductAccordions
        description={description}
        categoryName={categoryName}
        brandName={brandName}
      />

      {/* Size Guide Modal */}
      {showSizeGuideAffordance && (
        <SizeGuideModal
          isOpen={showSizeGuide}
          onClose={() => setShowSizeGuide(false)}
          categoryName={categoryName}
        />
      )}

      {/* 6. Mobile Sticky Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-lg backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-neutral-600">
              {selectedVariant ? selectedVariant.name : productName}
            </p>
            <p className="text-title font-bold text-brand-strong">
              {priceDisplay}
            </p>
          </div>

          <button
            type="button"
            disabled={!isPurchasable || pending}
            onClick={() => formRef.current?.requestSubmit()}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span>{purchaseButtonLabel}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
