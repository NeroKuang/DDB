import type { PayRow, StaffKind, Venue } from "@/compile/types";
import { isStoredOverride } from "@/components/payroll-format";

export type PayrollFilters = {
  query: string;
  venue: Venue | "all";
  kind: StaffKind | "all";
  titles: string[];
  overrideOnly: "all" | "manual" | "original";
};

export const EMPTY_PAYROLL_FILTERS: PayrollFilters = {
  query: "",
  venue: "all",
  kind: "all",
  titles: [],
  overrideOnly: "all",
};

export function rowHasStoredOverride(row: PayRow): boolean {
  return Object.keys(row.original).some((key) => {
    const field = key as keyof PayRow["original"];
    return isStoredOverride(row.original[field], row.stored[field]);
  });
}

function normalizeSearch(text: string): string {
  return text.trim().toLowerCase();
}

function rowMatchesQuery(row: PayRow, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [
    row.primaryNickname,
    row.legalName,
    row.title,
    row.payNote,
    row.allowanceNote,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterPayRows(
  rows: PayRow[],
  filters: PayrollFilters
): PayRow[] {
  const query = normalizeSearch(filters.query);
  return rows.filter((row) => {
    if (filters.venue !== "all" && row.venue !== filters.venue) {
      return false;
    }
    if (filters.kind !== "all" && row.kind !== filters.kind) {
      return false;
    }
    if (filters.titles.length > 0 && !filters.titles.includes(row.title)) {
      return false;
    }
    if (filters.overrideOnly === "manual" && !rowHasStoredOverride(row)) {
      return false;
    }
    if (filters.overrideOnly === "original" && rowHasStoredOverride(row)) {
      return false;
    }
    return rowMatchesQuery(row, query);
  });
}

export function extractPayrollFilterOptions(rows: PayRow[]): {
  titles: string[];
} {
  const titles = [
    ...new Set(rows.map((row) => row.title).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  return { titles };
}

export function countActiveFilters(filters: PayrollFilters): number {
  let count = 0;
  if (filters.query.trim()) {
    count += 1;
  }
  if (filters.venue !== "all") {
    count += 1;
  }
  if (filters.kind !== "all") {
    count += 1;
  }
  if (filters.titles.length > 0) {
    count += 1;
  }
  if (filters.overrideOnly !== "all") {
    count += 1;
  }
  return count;
}
