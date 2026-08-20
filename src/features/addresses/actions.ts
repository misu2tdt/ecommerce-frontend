"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildLoginHref, safeInternalPath } from "@/features/auth/redirects";
import { ApiError } from "@/lib/api";
import type { AddressInput } from "@/types/address";
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from "./api";

type AddressField = keyof AddressInput;

export interface AddressActionState {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<AddressField, string>>;
}

export interface AddressMutationState {
  status?: "success" | "error";
  message?: string;
}

export async function saveAddressAction(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const input = readAddressInput(formData);
  const fieldErrors = validateAddress(input);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const mode = readString(formData, "mode");
  const addressId = readPositiveInteger(formData, "addressId");
  if (mode !== "create" && (mode !== "edit" || !addressId)) {
    return { status: "error", message: "The address request is invalid." };
  }

  const returnPath = safeInternalPath(
    readString(formData, "returnPath"),
    "/account/addresses",
  );
  let failure: unknown;
  try {
    if (mode === "create") await createAddress(input);
    else await updateAddress(addressId!, input);
  } catch (error) {
    failure = error;
  }

  redirectIfUnauthenticated(failure, returnPath);
  if (failure) return { status: "error", message: addressErrorMessage(failure) };

  revalidateAddressViews();
  return {
    status: "success",
    message: mode === "create" ? "Address saved." : "Address updated.",
  };
}

export async function setDefaultAddressAction(
  _previousState: AddressMutationState,
  formData: FormData,
): Promise<AddressMutationState> {
  const addressId = readPositiveInteger(formData, "addressId");
  if (!addressId) {
    return { status: "error", message: "The address is invalid." };
  }
  return runAddressMutation(
    () => updateAddress(addressId, { isDefault: true }),
    formData,
    "Default address updated.",
  );
}

export async function deleteAddressAction(
  _previousState: AddressMutationState,
  formData: FormData,
): Promise<AddressMutationState> {
  const addressId = readPositiveInteger(formData, "addressId");
  if (!addressId) {
    return { status: "error", message: "The address is invalid." };
  }
  return runAddressMutation(
    () => deleteAddress(addressId),
    formData,
    "Address deleted.",
  );
}

async function runAddressMutation(
  mutation: () => Promise<unknown>,
  formData: FormData,
  successMessage: string,
): Promise<AddressMutationState> {
  const returnPath = safeInternalPath(
    readString(formData, "returnPath"),
    "/account/addresses",
  );
  let failure: unknown;
  try {
    await mutation();
  } catch (error) {
    failure = error;
  }

  redirectIfUnauthenticated(failure, returnPath);
  if (failure) return { status: "error", message: addressErrorMessage(failure) };
  revalidateAddressViews();
  return { status: "success", message: successMessage };
}

function readAddressInput(formData: FormData): AddressInput {
  return {
    label: readOptionalString(formData, "label"),
    recipientName: readString(formData, "recipientName").trim(),
    phone: readString(formData, "phone").trim(),
    addressLine1: readString(formData, "addressLine1").trim(),
    addressLine2: readOptionalString(formData, "addressLine2"),
    ward: readOptionalString(formData, "ward"),
    district: readOptionalString(formData, "district"),
    city: readString(formData, "city").trim(),
    stateProvince: readOptionalString(formData, "stateProvince"),
    postalCode: readOptionalString(formData, "postalCode"),
    countryCode: readString(formData, "countryCode").trim().toUpperCase(),
    isDefault: formData.get("isDefault") === "on",
  };
}

function validateAddress(input: AddressInput) {
  const errors: Partial<Record<AddressField, string>> = {};
  validateOptionalLength(errors, "label", input.label, 100, "Label");
  validateRequired(errors, "recipientName", input.recipientName, 150, "Recipient name");
  if (!/^[+0-9][0-9 ()-]{5,31}$/.test(input.phone)) {
    errors.phone = "Enter a valid phone number with 6 to 32 characters.";
  }
  validateRequired(errors, "addressLine1", input.addressLine1, 255, "Address line 1");
  validateOptionalLength(errors, "addressLine2", input.addressLine2, 255, "Address line 2");
  validateOptionalLength(errors, "ward", input.ward, 150, "Ward");
  validateOptionalLength(errors, "district", input.district, 150, "District");
  validateRequired(errors, "city", input.city, 150, "City");
  validateOptionalLength(errors, "stateProvince", input.stateProvince, 150, "State or province");
  validateOptionalLength(errors, "postalCode", input.postalCode, 32, "Postal code");
  if (!/^[A-Z]{2}$/.test(input.countryCode)) {
    errors.countryCode = "Enter a two-letter country code, such as VN.";
  }
  return errors;
}

function validateRequired(
  errors: Partial<Record<AddressField, string>>,
  field: AddressField,
  value: string,
  maximum: number,
  label: string,
) {
  if (!value) errors[field] = `${label} is required.`;
  else if (value.length > maximum)
    errors[field] = `${label} must be at most ${maximum} characters.`;
}

function validateOptionalLength(
  errors: Partial<Record<AddressField, string>>,
  field: AddressField,
  value: string | null,
  maximum: number,
  label: string,
) {
  if (value !== null && value.length > maximum) {
    errors[field] = `${label} must be at most ${maximum} characters.`;
  }
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = readString(formData, key).trim();
  return value || null;
}

function readPositiveInteger(formData: FormData, key: string): number | null {
  const raw = readString(formData, key);
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function redirectIfUnauthenticated(error: unknown, returnPath: string): void {
  if (error instanceof ApiError && error.status === 401) {
    redirect(buildLoginHref(returnPath));
  }
}

function addressErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Unable to update the address. Please try again.";
  }
  if ([400, 404, 409].includes(error.status)) return error.message;
  if (error.status === 0) return "The address service is unavailable. Please try again.";
  return "Unable to update the address. Please try again.";
}

function revalidateAddressViews(): void {
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
