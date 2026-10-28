import type { VndAmount } from "@/types/catalog";

export interface ProductPriceInput {
  minPrice: VndAmount | null;
  maxPrice: VndAmount | null;
  minCompareAtPrice?: VndAmount | null;
  maxCompareAtPrice?: VndAmount | null;
}

export interface ProductCardPrice {
  // The lowest price across the product's variants.
  amount: VndAmount;
  // True when variants have different prices: the card then says "From".
  isRange: boolean;
  // Struck-through price, only when it is higher than `amount`.
  compareAt: VndAmount | null;
  // Whole-number percentage off, only when there is a compare-at price.
  discountPercent: number | null;
}

// What a product card shows for the price. The summary only carries the lowest
// and highest compare-at price, so the discount is measured between the lowest
// price and the lowest compare-at price.
export function getProductCardPrice(
  input: ProductPriceInput,
): ProductCardPrice | null {
  const { minPrice, maxPrice, minCompareAtPrice } = input;
  if (minPrice === null || maxPrice === null) return null;

  const price: ProductCardPrice = {
    amount: minPrice,
    isRange: minPrice !== maxPrice,
    compareAt: null,
    discountPercent: null,
  };

  if (
    minCompareAtPrice === null ||
    minCompareAtPrice === undefined ||
    minCompareAtPrice <= minPrice
  ) {
    return price;
  }

  const discountPercent = Math.round((1 - minPrice / minCompareAtPrice) * 100);
  // A discount that rounds to 0% would be a badge saying "-0%".
  if (discountPercent < 1) return price;

  return { ...price, compareAt: minCompareAtPrice, discountPercent };
}
