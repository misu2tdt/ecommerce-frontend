"use client";

import { useState, useActionState, useTransition } from "react";
import {
  createCouponAction,
  toggleCouponActiveAction,
  updateCouponAction,
  type AdminCouponActionState,
} from "@/features/promotions/admin-actions";
import { formatDateTime } from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { Coupon } from "@/types/promotions";

const INITIAL_STATE: AdminCouponActionState = {};

export function PromotionsManager({ coupons }: { coupons: Coupon[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [createState, createAction, createPending] = useActionState(
    async (prev: AdminCouponActionState, formData: FormData) => {
      const res = await createCouponAction(prev, formData);
      if (res.status === "success") {
        setIsCreateOpen(false);
      }
      return res;
    },
    INITIAL_STATE,
  );

  const [editState, editAction, editPending] = useActionState(
    async (prev: AdminCouponActionState, formData: FormData) => {
      const res = await updateCouponAction(prev, formData);
      if (res.status === "success") {
        setEditingCoupon(null);
      }
      return res;
    },
    INITIAL_STATE,
  );

  const [isToggling, startTransition] = useTransition();

  const handleToggle = (id: number) => {
    startTransition(async () => {
      await toggleCouponActiveAction(id);
    });
  };

  const toInputDatetime = (iso: string | null): string => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Promotions & Coupons</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage promotional codes, percentage and fixed discounts, and order eligibility rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-800"
        >
          + Create new coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="font-semibold text-slate-700">No coupons configured yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create your first coupon code to start offering promotional discounts.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Discount</th>
                <th className="px-5 py-3.5">Min Subtotal</th>
                <th className="px-5 py-3.5">Max Discount</th>
                <th className="px-5 py-3.5">Schedule</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 font-mono text-xs font-bold text-emerald-900">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {coupon.name}
                  </td>
                  <td className="px-5 py-4">
                    {coupon.type === "PERCENTAGE" ? (
                      <span className="font-bold text-emerald-700">
                        {coupon.value}% off
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-700">
                        {formatVnd(coupon.value)} off
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {coupon.minSubtotal !== null
                      ? formatVnd(coupon.minSubtotal)
                      : "No minimum"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {coupon.maxDiscount !== null
                      ? formatVnd(coupon.maxDiscount)
                      : "No limit"}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {coupon.startsAt || coupon.endsAt ? (
                      <div>
                        {coupon.startsAt && <p>From: {formatDateTime(coupon.startsAt)}</p>}
                        {coupon.endsAt && <p>To: {formatDateTime(coupon.endsAt)}</p>}
                      </div>
                    ) : (
                      "Always valid"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        coupon.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCoupon(coupon)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggle(coupon.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-emerald-800 ${
                          coupon.isActive
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        {coupon.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 id="create-modal-title" className="text-xl font-bold text-slate-950">
                Create Promotion Coupon
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form action={createAction} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="e.g. SUMMER25"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Description Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. 25% Summer Flash Sale"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Discount Type *
                  </label>
                  <select
                    name="type"
                    defaultValue="PERCENTAGE"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED (VND)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    name="value"
                    min="1"
                    required
                    placeholder="e.g. 10 or 50000"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Min Subtotal (VND)
                  </label>
                  <input
                    type="number"
                    name="minSubtotal"
                    min="0"
                    placeholder="Optional minimum"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Max Discount (VND)
                  </label>
                  <input
                    type="number"
                    name="maxDiscount"
                    min="1"
                    placeholder="Optional cap (Percentage)"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="isActive"
                  id="create-isActive"
                  defaultChecked
                  className="h-4 w-4 rounded-sm border-slate-300 accent-emerald-700"
                />
                <label htmlFor="create-isActive" className="text-sm font-semibold text-slate-800">
                  Active immediately
                </label>
              </div>

              {createState.message && (
                <p
                  role="alert"
                  className={`text-sm font-semibold ${
                    createState.status === "error" ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {createState.message}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPending}
                  className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-900 disabled:opacity-60"
                >
                  {createPending ? "Creating..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 id="edit-modal-title" className="text-xl font-bold text-slate-950">
                Edit Promotion Coupon
              </h3>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form action={editAction} className="mt-5 space-y-4">
              <input type="hidden" name="id" value={editingCoupon.id} />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingCoupon.code}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Description Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingCoupon.name}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Discount Type *
                  </label>
                  <select
                    name="type"
                    defaultValue={editingCoupon.type}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED (VND)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    name="value"
                    min="1"
                    defaultValue={editingCoupon.value}
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Min Subtotal (VND)
                  </label>
                  <input
                    type="number"
                    name="minSubtotal"
                    min="0"
                    defaultValue={editingCoupon.minSubtotal ?? ""}
                    placeholder="Optional minimum"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Max Discount (VND)
                  </label>
                  <input
                    type="number"
                    name="maxDiscount"
                    min="1"
                    defaultValue={editingCoupon.maxDiscount ?? ""}
                    placeholder="Optional cap (Percentage)"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    defaultValue={toInputDatetime(editingCoupon.startsAt)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    defaultValue={toInputDatetime(editingCoupon.endsAt)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="isActive"
                  id="edit-isActive"
                  defaultChecked={editingCoupon.isActive}
                  className="h-4 w-4 rounded-sm border-slate-300 accent-emerald-700"
                />
                <label htmlFor="edit-isActive" className="text-sm font-semibold text-slate-800">
                  Active
                </label>
              </div>

              {editState.message && (
                <p
                  role="alert"
                  className={`text-sm font-semibold ${
                    editState.status === "error" ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {editState.message}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editPending}
                  className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-900 disabled:opacity-60"
                >
                  {editPending ? "Saving..." : "Update Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
