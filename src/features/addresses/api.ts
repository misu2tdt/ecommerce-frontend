import "server-only";

import { authenticatedApiFetch } from "@/features/auth/api";
import type { Address, AddressInput } from "@/types/address";

export function getAddresses(): Promise<Address[]> {
  return authenticatedApiFetch<Address[]>("/addresses");
}

export function createAddress(input: AddressInput): Promise<Address> {
  return authenticatedApiFetch<Address>("/addresses", {
    method: "POST",
    body: input,
  });
}

export function updateAddress(
  addressId: number,
  input: Partial<AddressInput>,
): Promise<Address> {
  return authenticatedApiFetch<Address>(`/addresses/${addressId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteAddress(addressId: number): Promise<void> {
  return authenticatedApiFetch<void>(`/addresses/${addressId}`, {
    method: "DELETE",
  });
}
