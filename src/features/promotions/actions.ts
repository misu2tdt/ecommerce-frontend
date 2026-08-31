"use server";

import { getCartQuote } from "@/features/cart/api";
import { ApiError } from "@/lib/api";
import type { CartQuoteResponse } from "@/types/promotions";

export async function fetchCartQuote(
  couponCode?: string,
): Promise<
  | { success: true; quote: CartQuoteResponse }
  | { success: false; error: string }
> {
  try {
    const quote = await getCartQuote(couponCode);
    return { success: true, quote };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Unable to apply promo code. Please try again.",
    };
  }
}
