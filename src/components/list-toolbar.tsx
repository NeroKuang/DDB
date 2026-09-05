"use client";

import {
  listRangeLabel,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/components/list-controls";

export function ListToolbar({
  query,
  onQueryChange,
  searchLabel = "搜尋",
  searchPlaceholder,
  pageSize,
  onPageSizeChange,
  page,
  onPageChange,
  pages,
  filteredCount,
  totalCount,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  onPageChange: (page: number) => void;
  pages: number;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-0.5 text-xs">
          <span className="text-muted">{searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="field-input"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted">每頁筆數</span>
          <select
            value={pageSize}
            onChange={(event) => {
              const value = Number(event.target.value) as PageSizeOption;
              onPageSizeChange(value);
            }}
            className="field-input min-w-[6rem] py-1.5 text-sm"
            aria-label="每頁筆數"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value={0}>全部</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{listRangeLabel(page, pageSize, filteredCount, totalCount)}</span>
        {pages > 1 ? (
          <nav className="flex items-center gap-2" aria-label="列表分頁">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="btn-secondary px-2 py-1 text-xs disabled:opacity-50"
            >
              上一頁
            </button>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="btn-secondary px-2 py-1 text-xs disabled:opacity-50"
            >
              下一頁
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

/** Page size + range + prev/next when search lives elsewhere. */
export function ListPageControls({
  pageSize,
  onPageSizeChange,
  page,
  onPageChange,
  pages,
  filteredCount,
  totalCount,
}: {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  onPageChange: (page: number) => void;
  pages: number;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
      <label className="flex items-center gap-2">
        <span>每頁筆數</span>
        <select
          value={pageSize}
          onChange={(event) => {
            const value = Number(event.target.value) as PageSizeOption;
            onPageSizeChange(value);
          }}
          className="field-input py-1 text-sm"
          aria-label="每頁筆數"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
          <option value={0}>全部</option>
        </select>
      </label>
      <span>{listRangeLabel(page, pageSize, filteredCount, totalCount)}</span>
      {pages > 1 ? (
        <nav className="flex items-center gap-2" aria-label="列表分頁">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="btn-secondary px-2 py-1 text-xs disabled:opacity-50"
          >
            上一頁
          </button>
          <span className="tabular-nums">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="btn-secondary px-2 py-1 text-xs disabled:opacity-50"
          >
            下一頁
          </button>
        </nav>
      ) : null}
    </div>
  );
}
