import {
  isValidPeriodKey,
  periodKeyDisplayLabel,
} from "@/lib/pay-period-calendar";

/** Label shown in UI, e.g. 2026-07 → 2026-07客座 */
export function guestPeriodLabel(periodKey: string): string {
  return `${periodKey}客座`;
}

export function guestPeriodDisplay(
  periodKey: string | null | undefined
): string {
  if (!periodKey || !isValidPeriodKey(periodKey)) {
    return "—";
  }
  return `${periodKeyDisplayLabel(periodKey)}客座`;
}

/** Regular staff always included; guest only when assigned to this 薪資期間. */
export function staffIncludedInPayPeriod(input: {
  kind: "regular" | "guest";
  guestPeriodKey?: string | null;
  periodKey: string;
}): boolean {
  if (input.kind === "regular") {
    return true;
  }
  return input.guestPeriodKey === input.periodKey;
}

/** Prisma filter: staff rows eligible for one pay period list/compile. */
export function staffWhereForPayPeriod(
  storeId: string,
  periodKey: string
): {
  storeId: string;
  OR: Array<{ kind: "REGULAR" } | { kind: "GUEST"; guestPeriodKey: string }>;
} {
  return {
    storeId,
    OR: [{ kind: "REGULAR" }, { kind: "GUEST", guestPeriodKey: periodKey }],
  };
}
