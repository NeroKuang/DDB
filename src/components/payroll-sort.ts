import type { PayRow } from "@/compile/types";

export type StaffPayProfile = {
  hourlyRate: number;
  payKind: "hourly" | "monthly";
};

export type PayrollSortKey =
  | "primaryNickname"
  | "title"
  | "venue"
  | "kind"
  | "hours"
  | "hourlyRate"
  | "sales"
  | "commission"
  | "monthlyPay"
  | "netPay";

export type SortDirection = "asc" | "desc";

export type PayrollSort = {
  key: PayrollSortKey;
  direction: SortDirection;
};

export const DEFAULT_PAYROLL_SORT: PayrollSort = {
  key: "primaryNickname",
  direction: "asc",
};

function hourlyRateForSort(
  row: PayRow,
  staffPayByNickname: Readonly<Record<string, StaffPayProfile>>
): number | null {
  const profile = staffPayByNickname[row.primaryNickname];
  if (!profile || profile.payKind === "monthly") {
    return null;
  }
  return profile.hourlyRate;
}

function compareNullableNumber(
  left: number | null,
  right: number | null
): number {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return left - right;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "zh-Hant");
}

export function comparePayRows(
  left: PayRow,
  right: PayRow,
  key: PayrollSortKey,
  staffPayByNickname: Readonly<Record<string, StaffPayProfile>> = {}
): number {
  switch (key) {
    case "primaryNickname":
      return compareText(left.primaryNickname, right.primaryNickname);
    case "title":
      return compareText(left.title, right.title);
    case "venue":
      return compareText(left.venue, right.venue);
    case "kind":
      return compareText(left.kind, right.kind);
    case "hours":
      return left.stored.hours - right.stored.hours;
    case "hourlyRate":
      return compareNullableNumber(
        hourlyRateForSort(left, staffPayByNickname),
        hourlyRateForSort(right, staffPayByNickname)
      );
    case "sales":
      return left.stored.sales - right.stored.sales;
    case "commission":
      return left.stored.commission - right.stored.commission;
    case "monthlyPay":
      return left.stored.monthlyPay - right.stored.monthlyPay;
    case "netPay":
      return left.stored.netPay - right.stored.netPay;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function sortPayRows(
  rows: readonly PayRow[],
  sort: PayrollSort,
  staffPayByNickname: Readonly<Record<string, StaffPayProfile>> = {}
): PayRow[] {
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort(
    (left, right) =>
      comparePayRows(left, right, sort.key, staffPayByNickname) * dir
  );
}

export function nextPayrollSort(
  current: PayrollSort,
  key: PayrollSortKey
): PayrollSort {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  return { key, direction: "desc" };
}
