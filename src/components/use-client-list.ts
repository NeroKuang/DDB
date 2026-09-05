"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_PAGE_SIZE,
  haystackIncludes,
  paginateItems,
  totalPages,
} from "@/components/list-controls";

export function useClientList<T>({
  items,
  getSearchHaystack,
  initialPageSize = DEFAULT_PAGE_SIZE,
}: {
  items: T[];
  getSearchHaystack: (item: T) => string;
  initialPageSize?: number;
}) {
  const [query, setQueryState] = useState("");
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [page, setPageState] = useState(1);

  const filtered = useMemo(
    () =>
      items.filter((item) => haystackIncludes(getSearchHaystack(item), query)),
    [items, query, getSearchHaystack]
  );

  const pages = totalPages(filtered.length, pageSize);
  const effectivePage = pages === 0 ? 1 : Math.min(page, pages);

  const pageItems = useMemo(
    () => paginateItems(filtered, effectivePage, pageSize),
    [filtered, effectivePage, pageSize]
  );

  function setQuery(value: string): void {
    setQueryState(value);
    setPageState(1);
  }

  function setPageSize(size: number): void {
    setPageSizeState(size);
    setPageState(1);
  }

  function setPage(nextPage: number): void {
    setPageState(nextPage);
  }

  return {
    query,
    setQuery,
    pageSize,
    setPageSize,
    page: effectivePage,
    setPage,
    pages,
    filteredCount: filtered.length,
    totalCount: items.length,
    pageItems,
  };
}
