"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  saveAddressAction,
  type AddressActionState,
} from "@/features/addresses/actions";
import type { Address, AddressInput } from "@/types/address";

const INITIAL_STATE: AddressActionState = {};

export function AddressForm({
  mode,
  address,
  returnPath,
}: {
  mode: "create" | "edit";
  address?: Address;
  returnPath: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveAddressAction,
    INITIAL_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = `address-${mode}-${address?.id ?? "new"}`;

  useEffect(() => {
    if (mode === "create" && state.status === "success") {
      formRef.current?.reset();
    }
  }, [mode, state.status]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="addressId" value={address?.id ?? ""} />
      <input type="hidden" name="returnPath" value={returnPath} />

      <AddressInputField
        id={`${idPrefix}-label`}
        name="label"
        label="Label"
        defaultValue={address?.label}
        maxLength={100}
        placeholder="Home, Work..."
        error={state.fieldErrors?.label}
      />
      <AddressInputField
        id={`${idPrefix}-recipient`}
        name="recipientName"
        label="Recipient name"
        defaultValue={address?.recipientName}
        maxLength={150}
        autoComplete="shipping name"
        required
        error={state.fieldErrors?.recipientName}
      />
      <AddressInputField
        id={`${idPrefix}-phone`}
        name="phone"
        label="Phone"
        defaultValue={address?.phone}
        maxLength={32}
        autoComplete="shipping tel"
        inputMode="tel"
        required
        error={state.fieldErrors?.phone}
      />
      <AddressInputField
        id={`${idPrefix}-line1`}
        name="addressLine1"
        label="Address line 1"
        defaultValue={address?.addressLine1}
        maxLength={255}
        autoComplete="shipping address-line1"
        required
        error={state.fieldErrors?.addressLine1}
        className="sm:col-span-2"
      />
      <AddressInputField
        id={`${idPrefix}-line2`}
        name="addressLine2"
        label="Address line 2"
        defaultValue={address?.addressLine2}
        maxLength={255}
        autoComplete="shipping address-line2"
        error={state.fieldErrors?.addressLine2}
        className="sm:col-span-2"
      />
      <AddressInputField
        id={`${idPrefix}-ward`}
        name="ward"
        label="Ward"
        defaultValue={address?.ward}
        maxLength={150}
        autoComplete="shipping address-level3"
        error={state.fieldErrors?.ward}
      />
      <AddressInputField
        id={`${idPrefix}-district`}
        name="district"
        label="District"
        defaultValue={address?.district}
        maxLength={150}
        error={state.fieldErrors?.district}
      />
      <AddressInputField
        id={`${idPrefix}-city`}
        name="city"
        label="City"
        defaultValue={address?.city}
        maxLength={150}
        autoComplete="shipping address-level2"
        required
        error={state.fieldErrors?.city}
      />
      <AddressInputField
        id={`${idPrefix}-state`}
        name="stateProvince"
        label="State or province"
        defaultValue={address?.stateProvince}
        maxLength={150}
        autoComplete="shipping address-level1"
        error={state.fieldErrors?.stateProvince}
      />
      <AddressInputField
        id={`${idPrefix}-postal`}
        name="postalCode"
        label="Postal code"
        defaultValue={address?.postalCode}
        maxLength={32}
        autoComplete="shipping postal-code"
        error={state.fieldErrors?.postalCode}
      />
      <AddressInputField
        id={`${idPrefix}-country`}
        name="countryCode"
        label="Country code"
        defaultValue={address?.countryCode ?? "VN"}
        minLength={2}
        maxLength={2}
        autoComplete="shipping country"
        required
        error={state.fieldErrors?.countryCode}
      />

      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:col-span-2">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault ?? false}
          className="h-5 w-5 accent-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        />
        <span className="text-sm font-semibold text-slate-800">
          Use as my default shipping address
        </span>
      </label>

      <div className="sm:col-span-2">
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              state.status === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {pending
            ? "Saving..."
            : mode === "create"
              ? "Save address"
              : "Update address"}
        </button>
      </div>
    </form>
  );
}

function AddressInputField({
  id,
  name,
  label,
  defaultValue,
  error,
  className = "",
  ...inputProps
}: {
  id: string;
  name: keyof AddressInput;
  label: string;
  defaultValue?: string | null;
  error?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "defaultValue">) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
