import { Suspense } from "react";
import { PageFocus } from "@/components/page-focus";
import { Pagination } from "@/components/pagination";
import { pageRange, withPage } from "@/lib/pagination";

// The footer of a paged list: which rows are shown, the page links, and focus
// moving to the top of the content when the page changes.
export function ListPager({
  path,
  page,
  totalPages,
  total,
  limit,
  label,
}: {
  path: string;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  const { from, to } = pageRange(page, limit, total);
  return (
    <div className="mt-6">
      <p className="text-center text-body-sm text-neutral-600" role="status">
        Showing {from}–{to} of {total}
      </p>
      <Suspense fallback={null}>
        <PageFocus targetId="main-content" />
      </Suspense>
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) => withPage(path, "", target)}
        label={label}
      />
    </div>
  );
}
