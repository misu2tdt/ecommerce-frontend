import { test, expect } from "@playwright/test";
import {
  clampQuantity,
  determineSelectorMode,
  formatVariantSecondaryLabel,
  getInitialSelection,
  reconcileSelectionOnColorChange,
  resolveVariant,
  sortSizes,
} from "../../src/lib/variant-selection";
import type { ProductVariant } from "../../src/types/catalog";

function makeVariant(overrides: Partial<ProductVariant>): ProductVariant {
  return {
    id: overrides.id ?? 1,
    sku: overrides.sku ?? "SKU-001",
    name: overrides.name ?? "Sample Variant",
    price: overrides.price ?? 199000,
    stock: overrides.stock ?? 10,
    attributes: overrides.attributes ?? {},
    position: overrides.position ?? 0,
  };
}

test.describe("Variant Selection & Purchase Logic", () => {
  test("1. Exact color + size match returns the real ProductVariant", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 101, sku: "BLK-M", attributes: { color: "Black", size: "M" } }),
      makeVariant({ id: 102, sku: "BLK-L", attributes: { color: "Black", size: "L" } }),
      makeVariant({ id: 103, sku: "WHT-S", attributes: { color: "White", size: "S" } }),
      makeVariant({ id: 104, sku: "WHT-M", attributes: { color: "White", size: "M" } }),
    ];

    const options = determineSelectorMode(variants);
    expect(options.mode).toBe("color_size");

    const resolved = resolveVariant(variants, options.mode, {
      color: "Black",
      size: "M",
      variantId: null,
    });
    expect(resolved).not.toBeNull();
    expect(resolved?.id).toBe(101);
    expect(resolved?.sku).toBe("BLK-M");
  });

  test("2. Incompatible color + size returns null (no fallback)", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 101, sku: "BLK-M", attributes: { color: "Black", size: "M" } }),
      makeVariant({ id: 102, sku: "BLK-L", attributes: { color: "Black", size: "L" } }),
      makeVariant({ id: 103, sku: "WHT-S", attributes: { color: "White", size: "S" } }),
    ];

    const options = determineSelectorMode(variants);
    const resolved = resolveVariant(variants, options.mode, {
      color: "Black",
      size: "S", // Black + S does NOT exist
      variantId: null,
    });
    expect(resolved).toBeNull();
  });

  test("3. Color-only product resolves exact color SKU", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 201, sku: "ECO-NAT", attributes: { color: "Natural Ecru" } }),
      makeVariant({ id: 202, sku: "ECO-BLK", attributes: { color: "Washed Black" } }),
    ];

    const options = determineSelectorMode(variants);
    expect(options.mode).toBe("color_only");

    const resolved = resolveVariant(variants, options.mode, {
      color: "Natural Ecru",
      size: null,
      variantId: null,
    });
    expect(resolved?.id).toBe(201);
  });

  test("4. Size-only product resolves exact size SKU", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 301, sku: "BELT-32", attributes: { size: "32" } }),
      makeVariant({ id: 302, sku: "BELT-34", attributes: { size: "34" } }),
    ];

    const options = determineSelectorMode(variants);
    expect(options.mode).toBe("size_only");

    const resolved = resolveVariant(variants, options.mode, {
      color: null,
      size: "34",
      variantId: null,
    });
    expect(resolved?.id).toBe(302);
  });

  test("5. One Size product with color resolves exact SKU", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 401, sku: "TOTE-BLK", attributes: { color: "Black", size: "One Size" } }),
      makeVariant({ id: 402, sku: "TOTE-NAT", attributes: { color: "Natural Canvas", size: "One Size" } }),
    ];

    const options = determineSelectorMode(variants);
    expect(options.mode).toBe("color_size");
    expect(options.hasMultipleSizes).toBe(false);

    const initial = getInitialSelection(variants, options);
    expect(initial.size).toBe("One Size"); // Auto-selects One Size since no multi-size decision is needed

    const resolved = resolveVariant(variants, options.mode, {
      color: "Black",
      size: "One Size",
      variantId: null,
    });
    expect(resolved?.id).toBe(401);
  });

  test("6. Single attribute-free variant resolves cleanly", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 501, sku: "SINGLE-SKU", attributes: {} }),
    ];

    const options = determineSelectorMode(variants);
    expect(options.mode).toBe("single");

    const initial = getInitialSelection(variants, options);
    const resolved = resolveVariant(variants, options.mode, initial);
    expect(resolved?.id).toBe(501);
  });

  test("7. Mixed attribute shapes fallback safely to generic mode", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 601, sku: "MIX-1", attributes: { color: "Navy", size: "M" } }),
      makeVariant({ id: 602, sku: "MIX-2", attributes: { color: "Navy" } }), // missing size
    ];

    const options = determineSelectorMode(variants);
    expect(options.mode).toBe("generic");

    const resolved = resolveVariant(variants, options.mode, {
      color: null,
      size: null,
      variantId: 602,
    });
    expect(resolved?.id).toBe(602);
  });

  test("8. Variants distinguished by third generic attribute switch to generic mode", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 701, sku: "PANT-BLK-M-REG", attributes: { color: "Black", size: "M", fit: "Regular" } }),
      makeVariant({ id: 702, sku: "PANT-BLK-M-RLX", attributes: { color: "Black", size: "M", fit: "Relaxed" } }),
    ];

    const options = determineSelectorMode(variants);
    expect(options.mode).toBe("generic"); // Avoids collision between identical color+size
  });

  test("9. Color switch preserves size when size is available in new color", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 1, attributes: { color: "Black", size: "M" } }),
      makeVariant({ id: 2, attributes: { color: "Black", size: "L" } }),
      makeVariant({ id: 3, attributes: { color: "White", size: "M" } }),
      makeVariant({ id: 4, attributes: { color: "White", size: "L" } }),
    ];

    const options = determineSelectorMode(variants);
    const reconciledSize = reconcileSelectionOnColorChange(variants, "White", "M", options);
    expect(reconciledSize).toBe("M");
  });

  test("10. Incompatible color switch resets multi-size selection to null", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 1, attributes: { color: "Black", size: "M" } }),
      makeVariant({ id: 2, attributes: { color: "Black", size: "L" } }),
      makeVariant({ id: 3, attributes: { color: "White", size: "S" } }),
    ];

    const options = determineSelectorMode(variants);
    const reconciledSize = reconcileSelectionOnColorChange(variants, "White", "L", options);
    expect(reconciledSize).toBeNull(); // Reset to null so shopper explicitly picks size
  });

  test("11. Out-of-stock variant can be resolved but clamped properly", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 801, sku: "OOS-SKU", stock: 0, attributes: { color: "Black", size: "M" } }),
    ];

    const options = determineSelectorMode(variants);
    const resolved = resolveVariant(variants, options.mode, { color: "Black", size: "M", variantId: null });
    expect(resolved?.stock).toBe(0);
    expect(clampQuantity(5, resolved?.stock ?? 0)).toBe(1);
  });

  test("12. Quantity reconciliation: quantity 8 on stock 10 clamped to 3 on stock 3", () => {
    const initialQty = 8;
    const newStock = 3;
    const clamped = clampQuantity(initialQty, newStock);
    expect(clamped).toBe(3);
  });

  test("13. All-stock-zero handles quantity cleanly", () => {
    const clamped = clampQuantity(10, 0);
    expect(clamped).toBe(1);
  });

  test("14. Multi-size initial state requires explicit size selection (size = null)", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 1, attributes: { color: "Black", size: "S" } }),
      makeVariant({ id: 2, attributes: { color: "Black", size: "M" } }),
      makeVariant({ id: 3, attributes: { color: "Black", size: "L" } }),
    ];

    const options = determineSelectorMode(variants);
    const initial = getInitialSelection(variants, options);
    expect(initial.color).toBe("Black");
    expect(initial.size).toBeNull(); // Must not preselect size on multi-size apparel
  });

  test("15. Single-size / One Size automatic selection remains usable", () => {
    const variants: ProductVariant[] = [
      makeVariant({ id: 1, attributes: { color: "Black", size: "One Size" } }),
    ];

    const options = determineSelectorMode(variants);
    const initial = getInitialSelection(variants, options);
    expect(initial.size).toBe("One Size");
  });

  test("16. Sizing order sorts correctly", () => {
    const unsorted = ["XL", "One Size", "S", "32", "M", "28", "2XL", "L"];
    const sorted = sortSizes(unsorted);
    expect(sorted).toEqual(["S", "M", "L", "XL", "2XL", "28", "32", "One Size"]);
  });

  test("17. Generic variant secondary label formats attributes and SKU deterministically", () => {
    const v1 = makeVariant({
      sku: "CC-BLK-32-REG",
      attributes: { color: "Washed Black", size: "32", fit: "Regular" },
    });
    expect(formatVariantSecondaryLabel(v1)).toBe("Washed Black · 32 · Regular (CC-BLK-32-REG)");

    const v2 = makeVariant({
      sku: "GEN-NOATTR",
      attributes: {},
    });
    expect(formatVariantSecondaryLabel(v2)).toBe("SKU: GEN-NOATTR");
  });
});
