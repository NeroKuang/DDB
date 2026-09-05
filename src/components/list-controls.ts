export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | 0;

/** 0 = show all rows on one page. */
export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  if (pageSize <= 0 || pageSize >= items.length) {
    return items;
  }
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize: number): number {
  if (count === 0) {
    return 1;
  }
  if (pageSize <= 0) {
    return 1;
  }
  return Math.ceil(count / pageSize);
}

export function listRangeLabel(
  page: number,
  pageSize: number,
  filteredCount: number,
  totalCount?: number
): string {
  if (filteredCount === 0) {
    return totalCount !== undefined && totalCount !== filteredCount
      ? `0 / ${totalCount} 筆`
      : "0 筆";
  }
  const totalNote =
    totalCount !== undefined && totalCount !== filteredCount
      ? `（全部 ${totalCount} 筆）`
      : "";
  if (pageSize <= 0 || pageSize >= filteredCount) {
    return `共 ${filteredCount} 筆${totalNote}`;
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredCount);
  return `第 ${start}–${end} 筆，共 ${filteredCount} 筆${totalNote}`;
}

export function normalizeListQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function haystackIncludes(haystack: string, query: string): boolean {
  const q = normalizeListQuery(query);
  if (!q) {
    return true;
  }
  return haystack.toLowerCase().includes(q);
}
