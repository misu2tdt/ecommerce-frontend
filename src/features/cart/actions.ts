"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref, safeInternalPath } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import {
  addCartItem,
  clearCart,
  removeCartItem,
  updateCartItem,
} from "./api";

export interface CartActionState {
  status?: "success" | "error";
  message?: string;
}

export async function addToCartAction(
  _previousState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const variantId = readPositiveInteger(formData, "variantId");
  const quantity = readPositiveInteger(formData, "quantity");
  if (!variantId || !quantity) {
    return { status: "error", message: "Choose a valid variant and quantity." };
  }

  const returnPath = safeInternalPath(readString(formData, "returnPath"), "/products");
  return runCartMutation(
    () => addCartItem(variantId, quantity),
    returnPath,
    "Added to your cart.",
  );
}

export async function updateCartItemAction(
  _previousState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const itemId = readPositiveInteger(formData, "itemId");
  const quantity = readPositiveInteger(formData, "quantity");
  if (!itemId || !quantity) {
    return { status: "error", message: "Quantity must be at least 1." };
  }

  return runCartMutation(
    () => updateCartItem(itemId, quantity),
    "/cart",
    "Quantity updated.",
  );
}

export async function removeCartItemAction(
  _previousState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const itemId = readPositiveInteger(formData, "itemId");
  if (!itemId) {
    return { status: "error", message: "The cart item is invalid." };
  }

  return runCartMutation(
    () => removeCartItem(itemId),
    "/cart",
    "Item removed.",
  );
}

export async function clearCartAction(
  previousState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  void previousState;
  void formData;
  return runCartMutation(clearCart, "/cart", "Cart cleared.");
}

async function runCartMutation(
  mutation: () => Promise<unknown>,
  unauthenticatedReturnPath: string,
  successMessage: string,
): Promise<CartActionState> {
  let failure: unknown;
  try {
    await mutation();
  } catch (error) {
    failure = error;
  }

  if (failure instanceof ApiError && failure.status === 401) {
    redirect(buildLoginHref(unauthenticatedReturnPath));
  }
  if (failure) {
    return { status: "error", message: cartErrorMessage(failure) };
  }

  revalidatePath("/cart");
  return { status: "success", message: successMessage };
}

function readPositiveInteger(formData: FormData, key: string): number | null {
  const rawValue = readString(formData, key);
  if (!/^[1-9]\d*$/.test(rawValue)) return null;
  const value = Number(rawValue);
  return Number.isSafeInteger(value) ? value : null;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function cartErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Unable to update your cart. Please try again.";
  }
  if (error.status === 400 || error.status === 404 || error.status === 409) {
    return error.message;
  }
  if (error.status === 0) {
    return "The cart service is unavailable. Please try again.";
  }
  return "Unable to update your cart. Please try again.";
}
