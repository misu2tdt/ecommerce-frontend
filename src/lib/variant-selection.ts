import type { ProductVariant } from "@/types/catalog";

export type SelectorMode =
  | "color_size"
  | "color_only"
  | "size_only"
  | "single"
  | "generic";

export interface SelectorOptions {
  mode: SelectorMode;
  colors: string[];
  sizes: string[];
  hasMultipleSizes: boolean;
  hasMultipleColors: boolean;
  genericVariants: ProductVariant[];
}

export interface VariantSelectionState {
  color: string | null;
  size: string | null;
  variantId: number | null;
}

const STANDARD_SIZE_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "XXL",
  "3XL",
  "XXXL",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "36",
  "38",
  "One Size",
];

const ATTRIBUTE_KEY_ORDER = ["color", "size", "fit", "style", "material"];

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const idxA = STANDARD_SIZE_ORDER.indexOf(a);
    const idxB = STANDARD_SIZE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function formatVariantSecondaryLabel(v: ProductVariant): string {
  const attrs = v.attributes ?? {};
  const entries = Object.entries(attrs);
  if (entries.length === 0) {
    return `SKU: ${v.sku}`;
  }

  const sorted = [...entries].sort(([a], [b]) => {
    const idxA = ATTRIBUTE_KEY_ORDER.indexOf(a);
    const idxB = ATTRIBUTE_KEY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const parts = sorted.map(([, val]) => val);
  return `${parts.join(" · ")} (${v.sku})`;
}

export function determineSelectorMode(
  variants: ProductVariant[],
): SelectorOptions {
  if (!variants || variants.length === 0) {
    return {
      mode: "single",
      colors: [],
      sizes: [],
      hasMultipleSizes: false,
      hasMultipleColors: false,
      genericVariants: [],
    };
  }

  if (variants.length === 1) {
    const v = variants[0];
    const color = v.attributes?.color;
    const size = v.attributes?.size;
    const colors = color ? [color] : [];
    const sizes = size ? [size] : [];
    return {
      mode: "single",
      colors,
      sizes,
      hasMultipleSizes: false,
      hasMultipleColors: false,
      genericVariants: variants,
    };
  }

  // Check attributes across all variants
  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();
  let hasVariantWithoutColor = false;
  let hasVariantWithoutSize = false;
  let hasExtraAttributes = false;

  for (const v of variants) {
    const attrs = v.attributes ?? {};
    const keys = Object.keys(attrs);

    if (attrs.color) {
      colorSet.add(attrs.color);
    } else {
      hasVariantWithoutColor = true;
    }

    if (attrs.size) {
      sizeSet.add(attrs.size);
    } else {
      hasVariantWithoutSize = true;
    }

    // Check if there are distinguishing keys beyond color and size
    const extraKeys = keys.filter((k) => k !== "color" && k !== "size");
    if (extraKeys.length > 0) {
      hasExtraAttributes = true;
    }
  }

  const colors = Array.from(colorSet);
  const sizes = sortSizes(Array.from(sizeSet));

  // If variants have distinguishing attributes beyond color/size, or mixed attribute keys
  if (hasExtraAttributes) {
    // Check if extra attributes cause collision if mapped only to color+size
    const signatureSet = new Set<string>();
    let hasCollision = false;
    for (const v of variants) {
      const sig = `${v.attributes?.color ?? ""}::${v.attributes?.size ?? ""}`;
      if (signatureSet.has(sig)) {
        hasCollision = true;
        break;
      }
      signatureSet.add(sig);
    }
    if (hasCollision) {
      return {
        mode: "generic",
        colors,
        sizes,
        hasMultipleSizes: sizes.length > 1,
        hasMultipleColors: colors.length > 1,
        genericVariants: variants,
      };
    }
  }

  // Case 1: All variants have both color and size
  if (!hasVariantWithoutColor && !hasVariantWithoutSize && colors.length > 0 && sizes.length > 0) {
    // Check uniqueness of color+size combinations
    const signatureSet = new Set<string>();
    let hasCollision = false;
    for (const v of variants) {
      const sig = `${v.attributes.color}::${v.attributes.size}`;
      if (signatureSet.has(sig)) {
        hasCollision = true;
        break;
      }
      signatureSet.add(sig);
    }

    if (!hasCollision) {
      return {
        mode: "color_size",
        colors,
        sizes,
        hasMultipleSizes: sizes.length > 1,
        hasMultipleColors: colors.length > 1,
        genericVariants: variants,
      };
    }
  }

  // Case 2: All variants have color only (no sizes across any variant)
  if (!hasVariantWithoutColor && sizeSet.size === 0 && colors.length > 0) {
    if (colors.length === variants.length) {
      return {
        mode: "color_only",
        colors,
        sizes: [],
        hasMultipleSizes: false,
        hasMultipleColors: colors.length > 1,
        genericVariants: variants,
      };
    }
  }

  // Case 3: All variants have size only (no colors across any variant)
  if (!hasVariantWithoutSize && colorSet.size === 0 && sizes.length > 0) {
    if (sizes.length === variants.length) {
      return {
        mode: "size_only",
        colors: [],
        sizes,
        hasMultipleSizes: sizes.length > 1,
        hasMultipleColors: false,
        genericVariants: variants,
      };
    }
  }

  // Fallback to generic concrete selector
  return {
    mode: "generic",
    colors,
    sizes,
    hasMultipleSizes: sizes.length > 1,
    hasMultipleColors: colors.length > 1,
    genericVariants: variants,
  };
}

export function getInitialSelection(
  variants: ProductVariant[],
  options: SelectorOptions,
): VariantSelectionState {
  if (options.mode === "single") {
    const single = variants[0];
    return {
      color: single?.attributes?.color ?? options.colors[0] ?? null,
      size: single?.attributes?.size ?? options.sizes[0] ?? null,
      variantId: single?.id ?? null,
    };
  }

  if (options.mode === "color_size") {
    // Deterministic initial color: first color with in-stock variants, or first color
    const firstInStock = variants.find((v) => v.stock > 0);
    const initialColor = firstInStock?.attributes?.color ?? options.colors[0] ?? null;

    // Multi-size apparel: shopper must deliberately choose a size (size = null)
    // Exception: genuine single size / One Size with only 1 size option
    let initialSize: string | null = null;
    if (!options.hasMultipleSizes && options.sizes.length === 1) {
      initialSize = options.sizes[0];
    }

    return {
      color: initialColor,
      size: initialSize,
      variantId: null,
    };
  }

  if (options.mode === "color_only") {
    const firstInStock = variants.find((v) => v.stock > 0);
    const initialColor = firstInStock?.attributes?.color ?? options.colors[0] ?? null;
    return {
      color: initialColor,
      size: null,
      variantId: null,
    };
  }

  if (options.mode === "size_only") {
    let initialSize: string | null = null;
    if (!options.hasMultipleSizes && options.sizes.length === 1) {
      initialSize = options.sizes[0];
    }
    return {
      color: null,
      size: initialSize,
      variantId: null,
    };
  }

  // Generic mode
  return {
    color: null,
    size: null,
    variantId: variants.length === 1 ? variants[0].id : null,
  };
}

export function resolveVariant(
  variants: ProductVariant[],
  mode: SelectorMode,
  selection: VariantSelectionState,
): ProductVariant | null {
  if (!variants || variants.length === 0) return null;

  if (mode === "single") {
    return variants[0] ?? null;
  }

  if (mode === "color_size") {
    if (!selection.color || !selection.size) return null;
    const match = variants.find(
      (v) =>
        v.attributes?.color === selection.color &&
        v.attributes?.size === selection.size,
    );
    return match ?? null;
  }

  if (mode === "color_only") {
    if (!selection.color) return null;
    const match = variants.find(
      (v) => v.attributes?.color === selection.color,
    );
    return match ?? null;
  }

  if (mode === "size_only") {
    if (!selection.size) return null;
    const match = variants.find((v) => v.attributes?.size === selection.size);
    return match ?? null;
  }

  if (mode === "generic") {
    if (selection.variantId === null) return null;
    const match = variants.find((v) => v.id === selection.variantId);
    return match ?? null;
  }

  return null;
}

export function reconcileSelectionOnColorChange(
  variants: ProductVariant[],
  newColor: string,
  currentSize: string | null,
  options: SelectorOptions,
): string | null {
  if (!currentSize) return null;

  // If only 1 size option exists for product (e.g. One Size)
  if (!options.hasMultipleSizes && options.sizes.length === 1) {
    const exists = variants.some(
      (v) =>
        v.attributes?.color === newColor &&
        v.attributes?.size === options.sizes[0],
    );
    return exists ? options.sizes[0] : null;
  }

  // Multi-size apparel:
  // If the same size exists in the new color, preserve it
  const exists = variants.some(
    (v) =>
      v.attributes?.color === newColor && v.attributes?.size === currentSize,
  );
  if (exists) {
    return currentSize;
  }

  // Otherwise, reset to null so shopper explicitly picks a size
  return null;
}

export function clampQuantity(quantity: number, stock: number): number {
  if (stock <= 0) return 1;
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return Math.min(Math.floor(quantity), stock);
}
