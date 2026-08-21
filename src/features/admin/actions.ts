"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import {
  createBrand,
  createCategory,
  createProduct,
  createVariant,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  updateBrand,
  updateAdminOrderStatus,
  updateAdminReviewVisibility,
  updateCategory,
  updateProduct,
  updateProductImage,
  updateVariant,
  uploadProductImage,
} from "./api";
import type { OrderStatus } from "@/types/order";

export interface AdminActionState {
  status?: "success" | "error";
  message?: string;
  entityId?: number;
}

export async function saveNamedCatalogAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin(readReturnPath(formData));
  if (denied) return denied;
  const resource = readString(formData, "resource");
  const mode = readString(formData, "mode");
  const id = readPositiveInteger(formData, "id");
  const name = readString(formData, "name").trim();
  const description = readString(formData, "description").trim();
  if (!name || name.length > 255) {
    return { status: "error", message: "Name is required and must be at most 255 characters." };
  }
  if (description && description.length > 2000) {
    return { status: "error", message: "Description must be at most 2,000 characters." };
  }
  if (!["category", "brand"].includes(resource) || !["create", "edit"].includes(mode)) {
    return { status: "error", message: "The catalog request is invalid." };
  }
  if (mode === "edit" && !id) return { status: "error", message: "The item identifier is invalid." };

  const input = { name, description };
  const mutation = resource === "category"
    ? mode === "create" ? () => createCategory(input) : () => updateCategory(id!, input)
    : mode === "create" ? () => createBrand(input) : () => updateBrand(id!, input);
  const failure = await captureFailure(mutation);
  if (failure) return adminError(failure, `Unable to save this ${resource}.`);
  revalidateCatalog();
  return { status: "success", message: `${capitalize(resource)} ${mode === "create" ? "created" : "updated"}.` };
}

export async function deleteNamedCatalogAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin(readReturnPath(formData));
  if (denied) return denied;
  const resource = readString(formData, "resource");
  const id = readPositiveInteger(formData, "id");
  if (!id || !["category", "brand"].includes(resource)) {
    return { status: "error", message: "The delete request is invalid." };
  }
  const failure = await captureFailure(() =>
    resource === "category" ? deleteCategory(id) : deleteBrand(id),
  );
  if (failure) return adminError(failure, `Unable to delete this ${resource}.`);
  revalidateCatalog();
  return { status: "success", message: `${capitalize(resource)} deleted.` };
}

export async function saveProductAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const returnPath = readReturnPath(formData);
  const denied = await requireAdmin(returnPath);
  if (denied) return denied;
  const mode = readString(formData, "mode");
  const id = readPositiveInteger(formData, "id");
  const name = readString(formData, "name").trim();
  const description = readString(formData, "description").trim();
  const categoryId = readPositiveInteger(formData, "categoryId");
  const rawBrandId = readString(formData, "brandId");
  const brandId = rawBrandId ? parsePositiveInteger(rawBrandId) : null;
  const status = readString(formData, "status");
  if (!name) return { status: "error", message: "Product name is required." };
  if (!categoryId || (rawBrandId && !brandId)) {
    return { status: "error", message: "Select a valid category and brand." };
  }
  if (!["active", "inactive"].includes(status) || !["create", "edit"].includes(mode)) {
    return { status: "error", message: "The Product request is invalid." };
  }
  if (mode === "edit" && !id) return { status: "error", message: "The Product identifier is invalid." };
  const input = { name, description, categoryId, brandId, status: status as "active" | "inactive" };
  let productId: number | undefined;
  const failure = await captureFailure(async () => {
    const product = mode === "create" ? await createProduct(input) : await updateProduct(id!, input);
    productId = product.id;
  });
  if (failure) return adminError(failure, "Unable to save this Product.");
  revalidateProducts();
  return { status: "success", message: `Product ${mode === "create" ? "created" : "updated"}.`, entityId: productId };
}

export async function deleteProductAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin(readReturnPath(formData));
  if (denied) return denied;
  const id = readPositiveInteger(formData, "id");
  if (!id) return { status: "error", message: "The Product identifier is invalid." };
  const failure = await captureFailure(() => deleteProduct(id));
  if (failure) return adminError(failure, "Unable to delete this Product.");
  revalidateProducts();
  return { status: "success", message: "Product deleted." };
}

export async function saveVariantAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const returnPath = readReturnPath(formData);
  const denied = await requireAdmin(returnPath);
  if (denied) return denied;
  const productId = readPositiveInteger(formData, "productId");
  const variantId = readPositiveInteger(formData, "variantId");
  const mode = readString(formData, "mode");
  const sku = readString(formData, "sku").trim().toUpperCase();
  const name = readString(formData, "name").trim();
  const price = readNonNegativeInteger(formData, "price");
  const stock = readNonNegativeInteger(formData, "stock");
  const position = readNonNegativeInteger(formData, "position");
  const attributes = parseAttributes(readString(formData, "attributes"));
  if (!productId || !name || price === null || stock === null || position === null || !attributes) {
    return { status: "error", message: "Provide a name, integer VND price, stock, position, and valid attributes." };
  }
  if (mode === "create" && (!sku || sku.length > 64)) {
    return { status: "error", message: "SKU is required and must be at most 64 characters." };
  }
  if (!["create", "edit"].includes(mode) || (mode === "edit" && !variantId)) return { status: "error", message: "The Variant request is invalid." };
  const input = { ...(mode === "create" ? { sku } : {}), name, price, stock, attributes, isActive: formData.get("isActive") === "on", position };
  const failure = await captureFailure(() => mode === "create"
    ? createVariant(productId, input)
    : updateVariant(productId, variantId!, input));
  if (failure) return adminError(failure, "Unable to save this Variant.");
  revalidateProduct(productId);
  return { status: "success", message: `Variant ${mode === "create" ? "created" : "updated"}.` };
}

export async function deleteVariantAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin(readReturnPath(formData));
  if (denied) return denied;
  const productId = readPositiveInteger(formData, "productId");
  const variantId = readPositiveInteger(formData, "variantId");
  if (!productId || !variantId) return { status: "error", message: "The Variant identifier is invalid." };
  const failure = await captureFailure(() => deleteVariant(productId, variantId));
  if (failure) return adminError(failure, "Unable to delete this Variant.");
  revalidateProduct(productId);
  return { status: "success", message: "Variant deleted." };
}

export async function uploadImageAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin(readReturnPath(formData));
  if (denied) return denied;
  const productId = readPositiveInteger(formData, "productId");
  const file = formData.get("file");
  const position = readNonNegativeInteger(formData, "position");
  if (!productId || !(file instanceof File) || file.size === 0 || position === null) {
    return { status: "error", message: "Choose an image and provide a valid position." };
  }
  if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { status: "error", message: "Use a JPEG, PNG, or WebP image no larger than 5 MB." };
  }
  const body = new FormData();
  body.append("file", file);
  const altText = optionalString(formData, "altText");
  if (altText) body.append("altText", altText);
  body.append("position", String(position));
  body.append("isPrimary", String(formData.get("isPrimary") === "on"));
  const failure = await captureFailure(() => uploadProductImage(productId, body));
  if (failure) return adminError(failure, "Unable to upload this image.");
  revalidateProduct(productId);
  return { status: "success", message: "Image uploaded." };
}

export async function updateImageAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin(readReturnPath(formData));
  if (denied) return denied;
  const productId = readPositiveInteger(formData, "productId");
  const imageId = readPositiveInteger(formData, "imageId");
  const position = readNonNegativeInteger(formData, "position");
  if (!productId || !imageId || position === null) return { status: "error", message: "The image metadata is invalid." };
  const failure = await captureFailure(() => updateProductImage(productId, imageId, {
    altText: optionalString(formData, "altText") ?? "",
    position,
    isPrimary: formData.get("isPrimary") === "on",
  }));
  if (failure) return adminError(failure, "Unable to update this image.");
  revalidateProduct(productId);
  return { status: "success", message: "Image metadata updated." };
}

export async function deleteImageAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin(readReturnPath(formData));
  if (denied) return denied;
  const productId = readPositiveInteger(formData, "productId");
  const imageId = readPositiveInteger(formData, "imageId");
  if (!productId || !imageId) return { status: "error", message: "The image identifier is invalid." };
  const failure = await captureFailure(() => deleteProductImage(productId, imageId));
  if (failure) return adminError(failure, "Unable to delete this image.");
  revalidateProduct(productId);
  return { status: "success", message: "Image deleted." };
}

export async function updateOrderStatusAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const orderId = readPositiveInteger(formData, "orderId");
  const returnPath = orderId ? `/admin/orders/${orderId}` : "/admin/orders";
  const denied = await requireAdmin(returnPath);
  if (denied) return denied;
  const status = readString(formData, "status");
  if (!orderId || !isOrderStatus(status)) {
    return { status: "error", message: "The Order status request is invalid." };
  }
  const failure = await captureFailure(() =>
    updateAdminOrderStatus(orderId, status),
  );
  if (failure) return adminError(failure, "Unable to update this Order.");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  return { status: "success", message: `Order moved to ${status}.` };
}

export async function updateReviewVisibilityAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await requireAdmin("/admin/reviews");
  if (denied) return denied;
  const reviewId = readPositiveInteger(formData, "reviewId");
  const visibility = readString(formData, "isVisible");
  if (!reviewId || !["true", "false"].includes(visibility)) {
    return { status: "error", message: "The Review moderation request is invalid." };
  }
  const failure = await captureFailure(async () => {
    await updateAdminReviewVisibility(
      reviewId,
      visibility === "true",
    );
  });
  if (failure) return adminError(failure, "Unable to moderate this Review.");
  revalidatePath("/admin/reviews");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  return {
    status: "success",
    message: visibility === "true" ? "Review restored." : "Review hidden.",
  };
}

async function requireAdmin(returnPath: string): Promise<AdminActionState | null> {
  let user;
  try { user = await getCurrentUser(); } catch (error) { return adminError(error, "Unable to verify ADMIN access."); }
  if (!user) redirect(buildLoginHref(returnPath));
  return user.role === "admin" ? null : { status: "error", message: "ADMIN access is required." };
}

async function captureFailure(mutation: () => Promise<unknown>): Promise<unknown> {
  try { await mutation(); return null; } catch (error) { return error; }
}

function adminError(error: unknown, fallback: string): AdminActionState {
  if (!(error instanceof ApiError)) return { status: "error", message: fallback };
  if (error.status === 401) redirect(buildLoginHref("/admin"));
  if (error.status === 403) return { status: "error", message: "ADMIN access is required." };
  if ([400, 404, 409].includes(error.status)) return { status: "error", message: error.message };
  if (error.status === 0) return { status: "error", message: "The catalog service is unavailable. Please try again." };
  return { status: "error", message: fallback };
}

function revalidateCatalog() { revalidatePath("/admin"); revalidatePath("/admin/categories"); revalidatePath("/admin/brands"); revalidatePath("/admin/products"); revalidatePath("/products"); }
function revalidateProducts() { revalidatePath("/admin"); revalidatePath("/admin/products"); revalidatePath("/products"); }
function revalidateProduct(productId: number) { revalidateProducts(); revalidatePath(`/admin/products/${productId}`); revalidatePath("/products/[slug]", "page"); }
function readReturnPath(formData: FormData) { const value = readString(formData, "returnPath"); return value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin"; }
function readString(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value : ""; }
function optionalString(formData: FormData, key: string) { return readString(formData, key).trim() || undefined; }
function parsePositiveInteger(raw: string) { if (!/^[1-9]\d*$/.test(raw)) return null; const value = Number(raw); return Number.isSafeInteger(value) ? value : null; }
function readPositiveInteger(formData: FormData, key: string) { return parsePositiveInteger(readString(formData, key)); }
function readNonNegativeInteger(formData: FormData, key: string) { const raw = readString(formData, key); if (!/^\d+$/.test(raw)) return null; const value = Number(raw); return Number.isSafeInteger(value) ? value : null; }
function parseAttributes(raw: string): Record<string, string> | null { try { const value: unknown = JSON.parse(raw || "{}"); if (!value || typeof value !== "object" || Array.isArray(value)) return null; const entries = Object.entries(value); return entries.every(([key, item]) => key.trim() && typeof item === "string") ? Object.fromEntries(entries.map(([key, item]) => [key.trim(), (item as string).trim()])) : null; } catch { return null; } }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function isOrderStatus(value: string): value is OrderStatus { return ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].includes(value); }
