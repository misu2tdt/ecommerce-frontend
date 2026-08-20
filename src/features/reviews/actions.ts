"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref, safeInternalPath } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { createReview, deleteMyReview, updateMyReview } from "./api";

export interface ReviewActionState {
  status?: "success" | "error";
  message?: string;
}

export async function createReviewAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  return saveReview(formData, false);
}

export async function updateReviewAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  return saveReview(formData, true);
}

export async function deleteReviewAction(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const productId = readPositiveInteger(formData, "productId");
  if (!productId) return invalidReview();
  return runReviewMutation(
    () => deleteMyReview(productId),
    formData,
    "Your review was deleted.",
  );
}

async function saveReview(
  formData: FormData,
  updating: boolean,
): Promise<ReviewActionState> {
  const productId = readPositiveInteger(formData, "productId");
  const rating = readRating(formData);
  if (!productId) return invalidReview();
  if (!rating) {
    return {
      status: "error",
      message: "Rating must be a whole number from 1 to 5.",
    };
  }

  const titleText = optionalText(formData, "title");
  const bodyText = optionalText(formData, "body");
  const title = titleText || (updating ? null : undefined);
  const body = bodyText || (updating ? null : undefined);
  if (title && title.length > 150) {
    return {
      status: "error",
      message: "Review title must be 150 characters or fewer.",
    };
  }
  if (body && body.length > 5000) {
    return {
      status: "error",
      message: "Review body must be 5,000 characters or fewer.",
    };
  }

  const input = { rating, title, body };
  return runReviewMutation(
    () =>
      updating
        ? updateMyReview(productId, input)
        : createReview(productId, input),
    formData,
    updating ? "Your review was updated." : "Your review was published.",
  );
}

async function runReviewMutation(
  mutation: () => Promise<unknown>,
  formData: FormData,
  successMessage: string,
): Promise<ReviewActionState> {
  const returnPath = safeInternalPath(
    readString(formData, "returnPath"),
    "/products",
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
  if (failure) return { status: "error", message: reviewErrorMessage(failure) };

  revalidatePath("/products");
  revalidatePath(returnPath.split("?")[0]);
  return { status: "success", message: successMessage };
}

function readRating(formData: FormData): number | null {
  const value = readString(formData, "rating");
  return /^[1-5]$/.test(value) ? Number(value) : null;
}

function readPositiveInteger(formData: FormData, key: string): number | null {
  const rawValue = readString(formData, key);
  if (!/^[1-9]\d*$/.test(rawValue)) return null;
  const value = Number(rawValue);
  return Number.isSafeInteger(value) ? value : null;
}

function optionalText(formData: FormData, key: string): string | undefined {
  const value = readString(formData, key).trim();
  return value || undefined;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function invalidReview(): ReviewActionState {
  return { status: "error", message: "The review request is invalid." };
}

function reviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return "Unable to save your review. Please try again.";
  if ([400, 403, 404, 409].includes(error.status)) return error.message;
  if (error.status === 0)
    return "The review service is unavailable. Please try again.";
  return "Unable to save your review. Please try again.";
}
