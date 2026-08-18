"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { login, register } from "./api";
import { safeInternalPath } from "./redirects";
import { clearSession, setSessionToken } from "./session";

export interface AuthFormState {
  message?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readEmail(formData);
  const password = readPassword(formData);
  const fieldErrors = validateCredentials(email, password, false);
  if (fieldErrors) return { fieldErrors };

  try {
    const response = await login(email, password);
    if (!response.access_token) {
      return { message: "The backend returned an invalid login response." };
    }
    await setSessionToken(response.access_token);
  } catch (error) {
    return { message: authErrorMessage(error, "login") };
  }

  redirect(safeInternalPath(readFormValue(formData, "next"), "/"));
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readEmail(formData);
  const password = readPassword(formData);
  const fieldErrors = validateCredentials(email, password, true);
  if (fieldErrors) return { fieldErrors };

  try {
    await register(email, password);
  } catch (error) {
    return { message: authErrorMessage(error, "register") };
  }

  const nextPath = safeInternalPath(readFormValue(formData, "next"), "/");
  const query = new URLSearchParams({ registered: "1" });
  if (nextPath !== "/") query.set("next", nextPath);
  redirect(`/login?${query}`);
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/");
}

function readEmail(formData: FormData): string {
  return readFormValue(formData, "email").trim();
}

function readPassword(formData: FormData): string {
  return readFormValue(formData, "password");
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateCredentials(
  email: string,
  password: string,
  registering: boolean,
): AuthFormState["fieldErrors"] | undefined {
  const fieldErrors: NonNullable<AuthFormState["fieldErrors"]> = {};
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!password) {
    fieldErrors.password = "Enter your password.";
  } else if (registering && password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function authErrorMessage(error: unknown, operation: "login" | "register") {
  if (error instanceof ApiError) {
    if (operation === "login" && error.status === 401) {
      return "Invalid email or password.";
    }
    if (operation === "register" && error.status === 409) {
      return "An account with this email already exists.";
    }
    return error.message;
  }
  return `Unable to ${operation}. Please try again.`;
}
