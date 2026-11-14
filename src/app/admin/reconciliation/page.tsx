import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackState } from "@/components/feedback-state";
import { ListPager } from "@/components/list-pager";
import { ReconciliationQueue } from "@/components/reconciliation-queue";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getReconciliationPage } from "@/features/reconciliation/api";
import type { CatalogSearchParams } from "@/features/catalog/search-params";
import { apiErrorMessage } from "@/lib/api";
import { pageRedirectTarget, parsePageParam } from "@/lib/pagination";
import {
  RECONCILIATION_FILTERS,
  RECONCILIATION_PATH,
  filterQuery,
  parseStatusFilter,
  reconciliationHref,
  totalPagesOf,
} from "@/lib/reconciliation";

export const metadata: Metadata = { title: "Payment reconciliation" };

export default async function AdminReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const status = parseStatusFilter(params.status);
  const pageParam = parsePageParam(params.page);

  let result;
  try {
    result = await getReconciliationPage(status, pageParam.page);
  } catch (error) {
    return (
      <FeedbackState
        title="Reconciliation queue unavailable"
        description={apiErrorMessage(error)}
      />
    );
  }
  const totalPages = totalPagesOf(result.total, result.limit);
  const redirectPage = pageRedirectTarget(pageParam, totalPages);
  if (redirectPage !== null) redirect(reconciliationHref(status, redirectPage));

  return (
    <>
      <div>
        <Eyebrow>Operations</Eyebrow>
        <h2 className="mt-2 text-heading font-bold tracking-tight text-brand-strong">
          Payment reconciliation
        </h2>
        <p className="mt-3 max-w-3xl text-neutral-600">
          Payment events that could not be applied cleanly, newest first. An
          admin handles each one outside this page, then records what was done.
          Recording a resolution does not change any order, payment or stock.
        </p>
      </div>

      <nav
        aria-label="Reconciliation status filter"
        className="mt-6 flex flex-wrap gap-2"
      >
        {RECONCILIATION_FILTERS.map((filter) => {
          const current = filter.value === status;
          return (
            <Link
              key={filter.value}
              href={reconciliationHref(filter.value)}
              aria-current={current ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
                current
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-brand hover:bg-brand-soft"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-4 text-body-sm text-neutral-600" role="status">
        {result.total} {result.total === 1 ? "event" : "events"}
      </p>

      <ReconciliationQueue items={result.items} status={status} />
      <ListPager
        path={RECONCILIATION_PATH}
        query={filterQuery(status)}
        page={pageParam.page}
        totalPages={totalPages}
        total={result.total}
        limit={result.limit}
        label="Reconciliation pages"
      />
    </>
  );
}
