"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { buildLoginHref } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import { RECONCILIATION_PATH, validateResolutionNote } from "@/lib/reconciliation";
import { resolveReconciliationEvent } from "./api";

export interface ResolveReconciliationState {
  status?: "success" | "error";
  message?: string;
  eventId?: number;
}

// Records that an admin handled an event. The backend changes no order, payment
// or stock here. The list is refreshed after a success and also after a
// conflict, because a conflict means the list on screen was out of date.
export async function resolveReconciliationAction(
  _previousState: ResolveReconciliationState,
  formData: FormData,
): Promise<ResolveReconciliationState> {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return { status: "error", message: "Unable to verify ADMIN access." };
  }
  if (!user) redirect(buildLoginHref(RECONCILIATION_PATH));
  if (user.role !== "admin") {
    return { status: "error", message: "ADMIN access is required." };
  }

  const eventId = readPositiveInteger(formData.get("eventId"));
  if (eventId === null) {
    return { status: "error", message: "The event identifier is invalid." };
  }
  const check = validateResolutionNote(readString(formData.get("note")));
  if (!check.valid) return { status: "error", message: check.message };

  try {
    await resolveReconciliationEvent(eventId, check.note);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      refreshQueue();
    }
    return failure(error);
  }
  refreshQueue();
  return {
    status: "success",
    message: `Event #${eventId} is recorded as resolved. No order, payment or stock was changed.`,
    eventId,
  };
}

function refreshQueue() {
  revalidatePath(RECONCILIATION_PATH);
  revalidatePath("/admin");
}

function failure(error: unknown): ResolveReconciliationState {
  const fallback = "Unable to resolve this event. Please try again.";
  if (!(error instanceof ApiError)) return { status: "error", message: fallback };
  if (error.status === 401) redirect(buildLoginHref(RECONCILIATION_PATH));
  if (error.status === 403) {
    return { status: "error", message: "ADMIN access is required." };
  }
  if ([400, 404, 409].includes(error.status)) {
    return { status: "error", message: error.message };
  }
  if (error.status === 0) {
    return {
      status: "error",
      message: "The service is unavailable. Please try again.",
    };
  }
  return { status: "error", message: fallback };
}

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function readPositiveInteger(value: FormDataEntryValue | null): number | null {
  const raw = readString(value);
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
