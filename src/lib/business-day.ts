const TAIPEI = "Asia/Taipei";

const taipeiClock = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIPEI,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function taipeiParts(at: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = Object.fromEntries(
    taipeiClock.formatToParts(at).map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** iCHEF checkout `YYYY/MM/DD HH:mm:ss` or punch `YYYY-MM-DD HH:mm:ss`, as Asia/Taipei wall time. */
export function parseIchefDateTime(raw: string): Date | null {
  const trimmed = raw.trim();
  const slash = trimmed.match(
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  const dash = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  const m = slash ?? dash;
  if (!m) {
    return null;
  }
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+08:00`);
}

export function isInPayPeriod(at: Date, start: Date, end: Date): boolean {
  return at.getTime() >= start.getTime() && at.getTime() < end.getTime();
}

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertValidBusinessDate(businessDate: string): void {
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new Error(`不支援的營業日期：${businessDate}`);
  }
  const month = Number(businessDate.slice(5, 7));
  const day = Number(businessDate.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`不支援的營業日期：${businessDate}`);
  }
}

/** 營業日標籤 YYYY-MM-DD：時刻落在 [D 12:00, D+1 12:00) Asia/Taipei。 */
export function businessDateOf(at: Date): string {
  const shifted = new Date(at.getTime() - 12 * 60 * 60 * 1000);
  return shifted.toLocaleDateString("en-CA", { timeZone: TAIPEI });
}

function addCalendarDays(isoDate: string, deltaDays: number): string {
  assertValidBusinessDate(isoDate);
  const at = new Date(`${isoDate}T12:00:00+08:00`);
  at.setUTCDate(at.getUTCDate() + deltaDays);
  return at.toLocaleDateString("en-CA", { timeZone: TAIPEI });
}

export function boundsForBusinessDateRange(
  startBusinessDate: string,
  endBusinessDate: string
): { startIso: string; endIso: string } {
  assertValidBusinessDate(startBusinessDate);
  assertValidBusinessDate(endBusinessDate);
  if (startBusinessDate > endBusinessDate) {
    throw new Error("營業日起迄順序不正確");
  }
  return {
    startIso: `${startBusinessDate}T12:00:00+08:00`,
    endIso: `${addCalendarDays(endBusinessDate, 1)}T12:00:00+08:00`,
  };
}

export function enumerateBusinessDates(
  startBusinessDate: string,
  endBusinessDate: string
): string[] {
  assertValidBusinessDate(startBusinessDate);
  assertValidBusinessDate(endBusinessDate);
  if (startBusinessDate > endBusinessDate) {
    throw new Error("營業日起迄順序不正確");
  }
  const dates: string[] = [];
  let cursor = startBusinessDate;
  while (cursor <= endBusinessDate) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

export function periodKeyForBusinessDate(businessDate: string): string {
  assertValidBusinessDate(businessDate);
  return businessDate.slice(0, 7);
}

/** iCHEF 日曆篩選：營業日 D 需拉 D～D+1。 */
export function ichefFileRangeForBusinessDate(businessDate: string): {
  startDate: string;
  endDate: string;
} {
  assertValidBusinessDate(businessDate);
  return {
    startDate: businessDate,
    endDate: addCalendarDays(businessDate, 1),
  };
}
