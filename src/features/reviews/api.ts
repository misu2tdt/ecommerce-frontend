import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import { apiFetch } from "@/lib/api";
import type { MyReview, PublicReview, ReviewInput } from "@/types/reviews";

const reviewPath = (productId: number) => `/products/${productId}/reviews`;

export function getPublicReviews(productId: number): Promise<PublicReview[]> {
  return apiFetch<PublicReview[]>(reviewPath(productId));
}

export function getMyReview(productId: number): Promise<MyReview> {
  return authenticatedApiFetch<MyReview>(`${reviewPath(productId)}/mine`);
}

export function createReview(
  productId: number,
  input: ReviewInput,
): Promise<unknown> {
  return authenticatedApiFetch(reviewPath(productId), {
    method: "POST",
    body: input,
  });
}

export function updateMyReview(
  productId: number,
  input: ReviewInput,
): Promise<unknown> {
  return authenticatedApiFetch(`${reviewPath(productId)}/mine`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteMyReview(productId: number): Promise<void> {
  return authenticatedApiFetch<void>(`${reviewPath(productId)}/mine`, {
    method: "DELETE",
  });
}
