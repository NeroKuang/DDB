const TAIPEI_TZ = "Asia/Taipei";

/** Stable zh-TW Taipei datetime for SSR + client (avoids thin-space hydration mismatch). */
export function formatTaipeiDateTime(
  value: Date | string | number | null | undefined
): string | null {
  if (value == null) {
    return null;
  }
  const at = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(at.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(at);

  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${pick("year")}/${pick("month")}/${pick("day")} ${pick("dayPeriod")}${pick("hour")}:${pick("minute")}:${pick("second")}`;
}
