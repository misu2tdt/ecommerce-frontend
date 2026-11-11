// Paging helpers shared by the catalog, the order history and the admin lists.
// The backend pages a list when it is sent `page` and/or `limit`: the body stays
// a plain array and the totals come back in the X-Total-Count, X-Total-Pages,
// X-Page and X-Limit headers.

// Page sizes the backend accepts (catalog: up to 48, other lists: up to 100).
export const CATALOG_PAGE_SIZE = 12;
export const LIST_PAGE_SIZE = 20;
// The collection grid: 12 cards fill complete rows of 2 and 3 columns.
export const COLLECTIONS_PAGE_SIZE = 12;

// The backend rejects a page number above this.
export const MAX_PAGE = 100_000;

export interface PageParam {
  page: number;
  // False when the address held something that is not a page number.
  valid: boolean;
}

// Reads `?page=` from an address. Only a plain whole number from 1 counts;
// anything else is invalid and means page 1.
export function parsePageParam(
  value: string | string[] | undefined,
): PageParam {
  if (value === undefined) return { page: 1, valid: true };
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!/^\d+$/.test(candidate ?? "")) return { page: 1, valid: false };
  const page = Number(candidate);
  if (page < 1 || page > MAX_PAGE) return { page: 1, valid: false };
  return { page, valid: true };
}

// Where to send a visitor whose page is not usable: null when it is fine.
// Past the end goes to the last page; an unusable value goes to page 1.
export function pageRedirectTarget(
  param: PageParam,
  totalPages: number,
): number | null {
  if (!param.valid) return 1;
  if (totalPages === 0) return param.page > 1 ? 1 : null;
  if (param.page > totalPages) return totalPages;
  return null;
}

export type PageItem = number | "ellipsis";

// The page numbers of a pager: always the first and last page and the current
// one with its neighbours; an ellipsis stands in for a gap of two or more pages.
export function pageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) return range(1, totalPages);
  if (current <= 4) return [...range(1, 5), "ellipsis", totalPages];
  if (current >= totalPages - 3) {
    return [1, "ellipsis", ...range(totalPages - 4, totalPages)];
  }
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", totalPages];
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

// "Showing 13 to 24 of 30".
export function pageRange(page: number, limit: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * limit + 1, to: Math.min(page * limit, total) };
}

// The address of a page. Page 1 has no `page` parameter, so the first page has
// one address; the filters and the sort stay in the query.
export function withPage(path: string, query: string, page: number): string {
  const params = new URLSearchParams(query);
  params.delete("page");
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

export interface PaginationInfo {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

// Reads the totals from a response. A backend that sends none (an older one)
// is read as a single page holding everything it returned.
export function readPagination(
  headers: Pick<Headers, "get">,
  returnedCount: number,
): PaginationInfo {
  const total = readCount(headers.get("x-total-count"), 0);
  const totalPages = readCount(headers.get("x-total-pages"), 0);
  const page = readCount(headers.get("x-page"), 1);
  const limit = readCount(headers.get("x-limit"), 1);
  if (total === null || totalPages === null || page === null || limit === null) {
    return singlePage(returnedCount);
  }
  return { total, totalPages, page, limit };
}

function singlePage(count: number): PaginationInfo {
  return {
    total: count,
    totalPages: count > 0 ? 1 : 0,
    page: 1,
    limit: Math.max(count, 1),
  };
}

// A whole number from `minimum`; null when absent or not a number.
function readCount(value: string | null, minimum: number): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= minimum ? parsed : null;
}
