import "server-only";

import { cache } from "react";
import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/types/auth";
import { getCurrentUserWithToken } from "./api";
import { getSessionToken } from "./session";

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    return await getCurrentUserWithToken(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});
