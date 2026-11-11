"use client";

import { useActionState } from "react";
import {
  toggleCollectionAction,
  type CollectionActionState,
} from "@/features/collections/admin-actions";
import { buttonStyles } from "@/components/ui/button";

const INITIAL_STATE: CollectionActionState = {};

// Activates or deactivates a collection. The visible label says what pressing it
// will do; the accessible name adds which collection.
export function CollectionToggleButton({
  id,
  name,
  isActive,
}: {
  id: number;
  name: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(
    toggleCollectionAction,
    INITIAL_STATE,
  );
  const label = isActive ? "Deactivate" : "Activate";
  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`${label} ${name}`}
        className={buttonStyles({ variant: "secondary", size: "md" })}
      >
        {pending ? "Saving..." : label}
      </button>
      {state.status === "error" && state.message && (
        <p role="alert" className="max-w-xs text-body-sm text-red-800">
          {state.message}
        </p>
      )}
    </form>
  );
}
