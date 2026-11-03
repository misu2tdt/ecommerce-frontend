import "server-only";

import {
  ApiError,
  apiFetch,
  apiFetchPage,
  type ApiRequestOptions,
} from "@/lib/api";
import { LIST_PAGE_SIZE, type PaginationInfo } from "@/lib/pagination";
import type {
  CurrentUser,
  LoginResponse,
  RegisterResponse,
} from "@/types/auth";
import { getSessionToken } from "./session";

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(
  email: string,
  password: string,
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/users/register", {
    method: "POST",
    body: { email, password },
  });
}

export function getCurrentUserWithToken(token: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/me", { token });
}

export async function authenticatedApiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const token = await getSessionToken();
  if (!token) throw new ApiError("Authentication is required.", 401);
  return apiFetch<T>(path, { ...options, token });
}

// One page of a list for the signed-in visitor (20 rows), with its totals.
export async function authenticatedApiFetchPage<T>(
  path: string,
  page: number,
): Promise<{ items: T[] } & PaginationInfo> {
  const token = await getSessionToken();
  if (!token) throw new ApiError("Authentication is required.", 401);
  return apiFetchPage<T>(path, { token }, { page, limit: LIST_PAGE_SIZE });
}