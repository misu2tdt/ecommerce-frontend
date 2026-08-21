"use client";

import { useActionState, useId } from "react";
import { updateOrderStatusAction, type AdminActionState } from "@/features/admin/actions";
import type { OrderStatus } from "@/types/order";

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
    return <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">This Order is in a terminal state. No further transitions are supported.</p>;
  }
  return (
    <form action={action} onSubmit={(event) => {
      const target = new FormData(event.currentTarget).get("status");
      if (target === "cancelled" && !window.confirm("Cancel this Order? Inventory will be restored, and paid Orders are rejected because refunds are unavailable.")) event.preventDefault();
    }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="orderId" value={orderId} />
      <h2 className="text-xl font-bold text-slate-950">Update status</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Only valid next lifecycle states are offered. The backend performs the final transition and inventory checks.</p>
      <label htmlFor={selectId} className="mt-5 block text-sm font-semibold text-slate-800">Next status</label>
      <select id={selectId} name="status" defaultValue={transitions[0]} disabled={pending} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:opacity-60">
        {transitions.map((transition) => <option key={transition} value={transition}>{labels[transition]}</option>)}
      </select>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 rounded-lg border px-4 py-3 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-4 min-h-11 rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60">{pending ? "Updating..." : "Update Order"}</button>
    </form>
  );
}
