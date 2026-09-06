"use client";

import {
  listRangeLabel,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/components/list-controls";
import { IconButton } from "@/components/icon-button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui-icons";

function PaginationNav({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  if (pages <= 1) {
    return null;
  }
  return (
    <nav className="flex items-center gap-1.5" aria-label="列表分頁">
      <IconButton
        label="上一頁"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <IconChevronLeft />
      </IconButton>
      <span className="min-w-[3.5rem] text-center tabular-nums">
        {page} / {pages}
      </span>
      <IconButton
        label="下一頁"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        <IconChevronRight />
      </IconButton>
    </nav>
  );
}

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
        <PaginationNav page={page} pages={pages} onPageChange={onPageChange} />
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
      <PaginationNav page={page} pages={pages} onPageChange={onPageChange} />
    </div>
  );
}
