"use client";

import { useActionState } from "react";
import {
  deleteAddressAction,
  setDefaultAddressAction,
  type AddressMutationState,
} from "@/features/addresses/actions";

import { buttonStyles } from "@/components/ui/button";
const INITIAL_STATE: AddressMutationState = {};

export function AddressMutationControls({
  addressId,
  isDefault,
}: {
  addressId: number;
  isDefault: boolean;
}) {
  const [defaultState, defaultAction, settingDefault] = useActionState(
    setDefaultAddressAction,
    INITIAL_STATE,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteAddressAction,
    INITIAL_STATE,
  );
  const pending = settingDefault || deleting;

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap gap-3">
        {!isDefault && (
          <form action={defaultAction}>
            <input type="hidden" name="addressId" value={addressId} />
            <input type="hidden" name="returnPath" value="/account/addresses" />
            <button
              type="submit"
              disabled={pending}
              className={buttonStyles({ variant: "secondary", size: "md" })}
            >
              {settingDefault ? "Updating..." : "Make default"}
            </button>
          </form>
        )}
        <form action={deleteAction}>
          <input type="hidden" name="addressId" value={addressId} />
          <input type="hidden" name="returnPath" value="/account/addresses" />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-md border border-red-300 px-4 py-2 text-body-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-55"
          >
            {deleting ? "Deleting..." : "Delete address"}
          </button>
        </form>
      </div>
      {(defaultState.message || deleteState.message) && (
        <p
          role={defaultState.status === "error" || deleteState.status === "error" ? "alert" : "status"}
          className={`mt-3 text-body-sm ${
            defaultState.status === "error" || deleteState.status === "error"
              ? "text-red-700"
              : "text-success"
          }`}
        >
          {defaultState.message ?? deleteState.message}
        </p>
      )}
    </div>
  );
}
