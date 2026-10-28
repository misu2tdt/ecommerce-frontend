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

import { buttonStyles } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
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
          <h2 className="text-title font-bold text-brand-strong">Promotions & Coupons</h2>
          <p className="mt-1 text-body-sm text-neutral-600">
            Manage promotional codes, percentage and fixed discounts, and order eligibility rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          + Create new coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-md border border-dashed border-field-border p-12 text-center">
          <p className="font-semibold text-neutral-700">No coupons configured yet</p>
          <p className="mt-1 text-body-sm text-neutral-600">
            Create your first coupon code to start offering promotional discounts.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-left text-body-sm text-neutral-700">
            <thead className="border-b border-line bg-surface-muted uppercase text-neutral-600 text-caption font-semibold tracking-eyebrow">
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
            <tbody className="divide-y divide-neutral-100 font-normal">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-neutral-50/80">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-md bg-brand-soft px-2.5 py-1 font-mono text-body-sm font-bold text-brand">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-brand">
                    {coupon.name}
                  </td>
                  <td className="px-5 py-4">
                    {coupon.type === "PERCENTAGE" ? (
                      <span className="font-bold text-brand">
                        {coupon.value}% off
                      </span>
                    ) : (
                      <span className="font-bold text-brand">
                        {formatVnd(coupon.value)} off
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-neutral-600">
                    {coupon.minSubtotal !== null
                      ? formatVnd(coupon.minSubtotal)
                      : "No minimum"}
                  </td>
                  <td className="px-5 py-4 text-neutral-600">
                    {coupon.maxDiscount !== null
                      ? formatVnd(coupon.maxDiscount)
                      : "No limit"}
                  </td>
                  <td className="px-5 py-4 text-body-sm text-neutral-600">
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
                    <Badge variant={coupon.isActive ? "success" : "neutral"}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCoupon(coupon)}
                        className={buttonStyles({ variant: "secondary", size: "md" })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggle(coupon.id)}
                        className={`rounded-md px-3 py-1.5 text-body-sm font-bold transition focus-visible:outline-2 focus-visible:outline-brand ${
                          coupon.isActive
                            ? "bg-brand-soft text-neutral-700 hover:bg-neutral-200"
                            : "bg-brand-soft text-brand hover:bg-brand-soft"
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-md border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 id="create-modal-title" className="text-title font-bold text-brand-strong">
                Create Promotion Coupon
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-md p-1 text-neutral-500 hover:bg-brand-soft hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form action={createAction} className="mt-5 space-y-4">
              <div>
                <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="e.g. SUMMER25"
                  className={fieldStyles("mt-1.5 font-mono uppercase")}
                />
              </div>

              <div>
                <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                  Description Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. 25% Summer Flash Sale"
                  className={fieldStyles("mt-1.5")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Discount Type *
                  </label>
                  <select
                    name="type"
                    defaultValue="PERCENTAGE"
                    className={fieldStyles("mt-1.5")}
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED (VND)</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    name="value"
                    min="1"
                    required
                    placeholder="e.g. 10 or 50000"
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Min Subtotal (VND)
                  </label>
                  <input
                    type="number"
                    name="minSubtotal"
                    min="0"
                    placeholder="Optional minimum"
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Max Discount (VND)
                  </label>
                  <input
                    type="number"
                    name="maxDiscount"
                    min="1"
                    placeholder="Optional cap (Percentage)"
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="isActive"
                  id="create-isActive"
                  defaultChecked
                  className="h-4 w-4 rounded-sm border-field-border accent-brand"
                />
                <label htmlFor="create-isActive" className="text-body-sm font-semibold text-neutral-800">
                  Active immediately
                </label>
              </div>

              {createState.message && (
                <p
                  role="alert"
                  className={`text-body-sm font-semibold ${
                    createState.status === "error" ? "text-red-600" : "text-success"
                  }`}
                >
                  {createState.message}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className={buttonStyles({ variant: "secondary", size: "md" })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPending}
                  className={buttonStyles({ variant: "primary", size: "md" })}
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-md border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 id="edit-modal-title" className="text-title font-bold text-brand-strong">
                Edit Promotion Coupon
              </h3>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="rounded-md p-1 text-neutral-500 hover:bg-brand-soft hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form action={editAction} className="mt-5 space-y-4">
              <input type="hidden" name="id" value={editingCoupon.id} />

              <div>
                <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingCoupon.code}
                  required
                  className={fieldStyles("mt-1.5 font-mono uppercase")}
                />
              </div>

              <div>
                <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                  Description Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingCoupon.name}
                  required
                  className={fieldStyles("mt-1.5")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Discount Type *
                  </label>
                  <select
                    name="type"
                    defaultValue={editingCoupon.type}
                    className={fieldStyles("mt-1.5")}
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FIXED">FIXED (VND)</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    name="value"
                    min="1"
                    defaultValue={editingCoupon.value}
                    required
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Min Subtotal (VND)
                  </label>
                  <input
                    type="number"
                    name="minSubtotal"
                    min="0"
                    defaultValue={editingCoupon.minSubtotal ?? ""}
                    placeholder="Optional minimum"
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Max Discount (VND)
                  </label>
                  <input
                    type="number"
                    name="maxDiscount"
                    min="1"
                    defaultValue={editingCoupon.maxDiscount ?? ""}
                    placeholder="Optional cap (Percentage)"
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    defaultValue={toInputDatetime(editingCoupon.startsAt)}
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
                <div>
                  <label className="block uppercase text-neutral-700 text-caption font-semibold tracking-eyebrow">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    defaultValue={toInputDatetime(editingCoupon.endsAt)}
                    className={fieldStyles("mt-1.5")}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="isActive"
                  id="edit-isActive"
                  defaultChecked={editingCoupon.isActive}
                  className="h-4 w-4 rounded-sm border-field-border accent-brand"
                />
                <label htmlFor="edit-isActive" className="text-body-sm font-semibold text-neutral-800">
                  Active
                </label>
              </div>

              {editState.message && (
                <p
                  role="alert"
                  className={`text-body-sm font-semibold ${
                    editState.status === "error" ? "text-red-600" : "text-success"
                  }`}
                >
                  {editState.message}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className={buttonStyles({ variant: "secondary", size: "md" })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editPending}
                  className={buttonStyles({ variant: "primary", size: "md" })}
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
