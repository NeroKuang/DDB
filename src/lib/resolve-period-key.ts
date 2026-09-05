import { cookies } from "next/headers";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import {
  isValidPeriodKey,
  previousCalendarMonthInTaipei,
  formatPeriodKey,
} from "@/lib/pay-period-calendar";
import { prisma } from "@/lib/prisma";

export const PERIOD_COOKIE_NAME = "ddb-period";

export function parsePeriodKeyCandidate(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !isValidPeriodKey(trimmed)) {
    return null;
  }
  return trimmed;
}

export function defaultPeriodKey(): string {
  const { year, month } = previousCalendarMonthInTaipei();
  return formatPeriodKey(year, month);
}

export async function latestPeriodKeyForStore(
  storeId: string
): Promise<string | null> {
  const row = await prisma.payPeriod.findFirst({
    where: { storeId },
    orderBy: { periodKey: "desc" },
    select: { periodKey: true },
  });
  return row?.periodKey ?? null;
}

export async function resolvePeriodKey(input?: {
  searchParam?: string | null;
  storeId?: string;
}): Promise<string> {
  const fromSearch = parsePeriodKeyCandidate(input?.searchParam);
  if (fromSearch) {
    return fromSearch;
  }

  const cookieStore = await cookies();
  const fromCookie = parsePeriodKeyCandidate(
    cookieStore.get(PERIOD_COOKIE_NAME)?.value
  );
  if (fromCookie) {
    return fromCookie;
  }

  if (input?.storeId) {
    const latest = await latestPeriodKeyForStore(input.storeId);
    if (latest && isValidPeriodKey(latest)) {
      return latest;
    }
  }

  return JULY_2026_PERIOD_KEY;
}

export function periodKeyFromFormData(formData: FormData): string {
  const fromForm = parsePeriodKeyCandidate(
    String(formData.get("periodKey") ?? "")
  );
  if (fromForm) {
    return fromForm;
  }
  throw new Error("薪資期間缺失或格式不正確。");
}
