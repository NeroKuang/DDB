import type {
  BusinessDayBounds,
  FileDateRange,
} from "@/compile/period-catalog";

export const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/;

export function isValidPeriodKey(periodKey: string): boolean {
  if (!PERIOD_KEY_PATTERN.test(periodKey)) {
    return false;
  }
  const month = Number(periodKey.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function assertValidPeriodKey(periodKey: string): void {
  if (!isValidPeriodKey(periodKey)) {
    throw new Error(`不支援的薪資期間：${periodKey}`);
  }
}

export function formatPeriodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Display label for selector, e.g. 2026-07 → 2026 年 7 月 */
export function periodKeyDisplayLabel(periodKey: string): string {
  assertValidPeriodKey(periodKey);
  const year = periodKey.slice(0, 4);
  const month = Number(periodKey.slice(5, 7));
  return `${year} 年 ${month} 月`;
}

function calendarDayBefore(isoDate: string): string {
  const at = new Date(`${isoDate}T12:00:00+08:00`);
  at.setUTCDate(at.getUTCDate() - 1);
  return at.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

/** 營業日：該月 1 日 12:00 至次月 1 日 12:00（Asia/Taipei）。 */
export function businessDaysForCalendarMonth(
  periodKey: string
): BusinessDayBounds {
  assertValidPeriodKey(periodKey);
  const year = Number(periodKey.slice(0, 4));
  const month = Number(periodKey.slice(5, 7));
  const startIso = `${formatPeriodKey(year, month)}-01T12:00:00+08:00`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endIso = `${formatPeriodKey(nextYear, nextMonth)}-01T12:00:00+08:00`;
  return { startIso, endIso };
}

/** iCHEF 匯出區間：營業日前一日至次月 1 日（含）。 */
export function fileRangeForCalendarMonth(periodKey: string): FileDateRange {
  assertValidPeriodKey(periodKey);
  const year = Number(periodKey.slice(0, 4));
  const month = Number(periodKey.slice(5, 7));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    startDate: calendarDayBefore(`${formatPeriodKey(year, month)}-01`),
    endDate: `${formatPeriodKey(nextYear, nextMonth)}-01`,
  };
}

/** Rolling calendar months ending at the given anchor (default: previous month in Taipei). */
export function rollingPeriodKeys(
  count: number,
  anchor?: { year: number; month: number }
): string[] {
  const base = anchor ?? previousCalendarMonthInTaipei();
  const keys: string[] = [];
  let year = base.year;
  let month = base.month;
  for (let index = 0; index < count; index += 1) {
    keys.push(formatPeriodKey(year, month));
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return keys;
}

export function previousCalendarMonthInTaipei(at = new Date()): {
  year: number;
  month: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(at);
  let year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  let month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  month -= 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return { year, month };
}
