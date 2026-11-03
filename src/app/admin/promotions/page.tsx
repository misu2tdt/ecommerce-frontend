import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ListPager } from "@/components/list-pager";
import { PromotionsManager } from "@/components/promotions-manager";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import { adminGetCouponsPage } from "@/features/promotions/api";
import { apiErrorMessage } from "@/lib/api";
import {
  pageRedirectTarget,
  parsePageParam,
  withPage,
  type PaginationInfo,
} from "@/lib/pagination";
import type { Coupon } from "@/types/promotions";

export const metadata: Metadata = {
  title: "Admin Promotions",
  description: "Manage promotional coupons and discount rules.",
};

export default async function AdminPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const pageParam = parsePageParam((await searchParams).page);
  let result: { items: Coupon[] } & PaginationInfo;
  try {
    result = await adminGetCouponsPage(pageParam.page);
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

  const redirectPage = pageRedirectTarget(pageParam, result.totalPages);
  if (redirectPage !== null) {
    redirect(withPage("/admin/promotions", "", redirectPage));
  }

  return (
    <div className="space-y-6">
      <PromotionsManager coupons={result.items} />
      <ListPager
        path="/admin/promotions"
        page={pageParam.page}
        totalPages={result.totalPages}
        total={result.total}
        limit={result.limit}
        label="Coupons pages"
      />
    </div>
  );
}
