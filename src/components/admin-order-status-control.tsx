"use client";

import { useActionState, useId } from "react";
import { updateOrderStatusAction, type AdminActionState } from "@/features/admin/actions";
import type { OrderStatus } from "@/types/order";

import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
const INITIAL_STATE: AdminActionState = {};
const nextTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const labels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function AdminOrderStatusControl({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const [state, action, pending] = useActionState(updateOrderStatusAction, INITIAL_STATE);
  const selectId = useId();
  const transitions = nextTransitions[status];
  if (transitions.length === 0) {
    return <p className="rounded-md bg-brand-soft p-4 text-body-sm text-neutral-600">This Order is in a terminal state. No further transitions are supported.</p>;
  }
  return (
    <form action={action} onSubmit={(event) => {
      const target = new FormData(event.currentTarget).get("status");
      if (target === "cancelled" && !window.confirm("Cancel this Order? Inventory will be restored, and paid Orders are rejected because refunds are unavailable.")) event.preventDefault();
    }} className="rounded-md border border-line bg-surface p-5">
      <input type="hidden" name="orderId" value={orderId} />
      <h2 className="text-title font-bold text-brand-strong">Update status</h2>
      <p className="mt-2 text-body text-neutral-600">Only valid next lifecycle states are offered. The backend performs the final transition and inventory checks.</p>
      <label htmlFor={selectId} className="mt-5 block text-body-sm font-semibold text-neutral-800">Next status</label>
      <select id={selectId} name="status" defaultValue={transitions[0]} disabled={pending} className={fieldStyles("mt-2")}>
        {transitions.map((transition) => <option key={transition} value={transition}>{labels[transition]}</option>)}
      </select>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 rounded-md border px-4 py-3 text-body-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-success/30 bg-success-soft text-success"}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className={buttonStyles({ variant: "primary", size: "md", className: "mt-4" })}>{pending ? "Updating..." : "Update Order"}</button>
    </form>
  );
}
