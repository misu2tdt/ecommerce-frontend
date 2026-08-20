"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref, safeInternalPath } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { addWishlistItem, removeWishlistItem } from "./api";

export interface WishlistActionState {
  status?: "success" | "error";
  message?: string;
}

export async function addWishlistItemAction(
  _previousState: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const productId = readPositiveInteger(formData, "productId");
  if (!productId) return invalidItem();

  return runWishlistMutation(
    () => addWishlistItem(productId),
    formData,
    "Saved to your wishlist.",
  );
}

export async function removeWishlistItemAction(
  _previousState: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const productId = readPositiveInteger(formData, "productId");
  if (!productId) return invalidItem();

  return runWishlistMutation(
    () => removeWishlistItem(productId),
    formData,
    "Removed from your wishlist.",
  );
}

async function runWishlistMutation(
  mutation: () => Promise<unknown>,
  formData: FormData,
  successMessage: string,
): Promise<WishlistActionState> {
  const returnPath = safeInternalPath(
    readString(formData, "returnPath"),
    "/wishlist",
  );
  let failure: unknown;
  try {
    await mutation();
  } catch (error) {
    failure = error;
  }

  if (failure instanceof ApiError && failure.status === 401) {
    redirect(buildLoginHref(returnPath));
  }
  if (failure)
    return { status: "error", message: wishlistErrorMessage(failure) };

  revalidatePath("/wishlist");
  revalidatePath("/products");
  revalidatePath(returnPath.split("?")[0]);
  return { status: "success", message: successMessage };
}

function invalidItem(): WishlistActionState {
  return { status: "error", message: "The wishlist item is invalid." };
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

function wishlistErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Unable to update your wishlist. Please try again.";
  }
  if ([400, 403, 404, 409].includes(error.status)) return error.message;
  if (error.status === 0) {
    return "The wishlist service is unavailable. Please try again.";
  }
  return "Unable to update your wishlist. Please try again.";
}
