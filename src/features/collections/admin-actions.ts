"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { parseCollectionForm, parseProductIds } from "@/lib/collection-form";
import { toCollectionAdminMessage } from "@/lib/shopper-messages";
import type { AdminCollectionProduct } from "@/types/collections";
import { COLLECTIONS_NAV_TAG } from "./api";
import {
  adminCreateCollection,
  adminReplaceCollectionProducts,
  adminToggleCollection,
  adminUpdateCollection,
} from "./admin-api";

export interface CollectionActionState {
  status?: "success" | "error";
  message?: string;
}

export interface SaveProductsResult extends CollectionActionState {
  // The saved list as the backend stored it, in display order (on success).
  products?: AdminCollectionProduct[];
}

const LIST_PATH = "/admin/collections";

export async function createCollectionAction(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  const denied = await requireAdmin(`${LIST_PATH}/new`);
  if (denied) return denied;
  const parsed = parseCollectionForm(formData, "create");
  if (!parsed.ok) return { status: "error", message: parsed.message };

  let id: number;
  try {
    id = (await adminCreateCollection(parsed.input)).id;
  } catch (error) {
    return failure(error, "Unable to create this collection.");
  }
  revalidateCollections();
  // Straight to the new collection, where its products are chosen.
  redirect(`${LIST_PATH}/${id}?created=1`);
}

export async function updateCollectionAction(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  const id = readId(formData);
  const denied = await requireAdmin(id ? `${LIST_PATH}/${id}` : LIST_PATH);
  if (denied) return denied;
  if (!id) return { status: "error", message: "The collection identifier is invalid." };
  const parsed = parseCollectionForm(formData, "edit");
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    await adminUpdateCollection(id, parsed.input);
  } catch (error) {
    return failure(error, "Unable to save this collection.");
  }
  revalidateCollections(id);
  return { status: "success", message: "Collection saved." };
}

// Flips the collection between active (shown to shoppers once it holds a product
// they can buy) and inactive (hidden from every public page).
export async function toggleCollectionAction(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  const id = readId(formData);
  const denied = await requireAdmin(id ? `${LIST_PATH}/${id}` : LIST_PATH);
  if (denied) return denied;
  if (!id) return { status: "error", message: "The collection identifier is invalid." };

  try {
    const collection = await adminToggleCollection(id);
    revalidateCollections(id);
    return {
      status: "success",
      message: collection.isActive ? "Collection activated." : "Collection deactivated.",
    };
  } catch (error) {
    return failure(error, "Unable to change this collection.");
  }
}

// Replaces the products of a collection with `productIds`, in display order. The
// backend does it in one step: either the whole new list is saved or the old
// one stays.
export async function saveCollectionProductsAction(
  collectionId: number,
  productIds: number[],
): Promise<SaveProductsResult> {
  const denied = await requireAdmin(`${LIST_PATH}/${collectionId}`);
  if (denied) return denied;
  if (!Number.isSafeInteger(collectionId) || collectionId < 1) {
    return { status: "error", message: "The collection identifier is invalid." };
  }
  const parsed = parseProductIds(productIds);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  try {
    const products = await adminReplaceCollectionProducts(collectionId, parsed.ids);
    revalidateCollections(collectionId);
    return {
      status: "success",
      message:
        products.length === 0
          ? "Saved. The collection is now empty."
          : `Saved ${products.length} ${products.length === 1 ? "product" : "products"} in this order.`,
      products,
    };
  } catch (error) {
    return failure(error, "Unable to save the products.");
  }
}

async function requireAdmin(returnPath: string): Promise<CollectionActionState | null> {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    return failure(error, "Unable to verify ADMIN access.");
  }
  if (!user) redirect(buildLoginHref(returnPath));
  return user.role === "admin"
    ? null
    : { status: "error", message: "ADMIN access is required." };
}

function failure(error: unknown, fallback: string): CollectionActionState {
  if (!(error instanceof ApiError)) return { status: "error", message: fallback };
  if (error.status === 401) redirect(buildLoginHref("/admin"));
  if (error.status === 403) return { status: "error", message: "ADMIN access is required." };
  if ([400, 404, 409].includes(error.status)) {
    return { status: "error", message: toCollectionAdminMessage(error.message) };
  }
  if (error.status === 0) {
    return { status: "error", message: "The catalog service is unavailable. Please try again." };
  }
  return { status: "error", message: fallback };
}

// Everything a change can show on: the staff pages, the public collection pages,
// the home page (featured section) and the menus' "any collection?" answer.
function revalidateCollections(id?: number) {
  revalidatePath("/admin");
  revalidatePath(LIST_PATH);
  if (id) revalidatePath(`${LIST_PATH}/${id}`);
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/");
  // A Server Action: the change shows on the very next request.
  updateTag(COLLECTIONS_NAV_TAG);
}

function readId(formData: FormData): number | null {
  const value = formData.get("id");
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
