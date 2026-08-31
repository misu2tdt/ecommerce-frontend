import type { Metadata } from "next";
import { FeedbackState } from "@/components/feedback-state";
import { PromotionsManager } from "@/components/promotions-manager";
import { adminGetCoupons } from "@/features/promotions/api";
import { apiErrorMessage } from "@/lib/api";
import type { Coupon } from "@/types/promotions";

export const metadata: Metadata = {
  title: "Admin Promotions",
  description: "Manage promotional coupons and discount rules.",
};

export default async function AdminPromotionsPage() {
  let coupons: Coupon[];
  try {
    coupons = await adminGetCoupons();
  } catch (error) {
    return (
      <FeedbackState
        title="Promotions unavailable"
        description={apiErrorMessage(error)}
        actionHref="/admin/promotions"
        actionLabel="Try again"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PromotionsManager coupons={coupons} />
    </div>
  );
}
