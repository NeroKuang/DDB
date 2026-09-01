/** Calendar months elapsed since periodKey (YYYY-MM) in Asia/Taipei. */
export function monthsSincePeriodKey(
  periodKey: string,
  now = new Date()
): number {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!match) {
    return 0;
  }
  const periodYear = Number(match[1]);
  const periodMonth = Number(match[2]);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const nowYear = Number(parts.find((part) => part.type === "year")?.value);
  const nowMonth = Number(parts.find((part) => part.type === "month")?.value);
  return (nowYear - periodYear) * 12 + (nowMonth - periodMonth);
}

export type RetentionPhase = "hot" | "archive" | "purge" | "none";

/** ADR-0083: ≤3mo hot, 3–12mo archive, >12mo purge archived bundles. */
export function retentionPhaseForAge(months: number): RetentionPhase {
  if (months <= 3) {
    return "hot";
  }
  if (months <= 12) {
    return "archive";
  }
  return "purge";
}

export function retentionPhaseLabel(phase: RetentionPhase): string {
  switch (phase) {
    case "hot":
      return "熱資料（原始 xlsx）";
    case "archive":
      return "應壓縮存檔";
    case "purge":
      return "應刪除存檔";
    default:
      return "—";
  }
}

export function rawRetentionStateLabel(
  state: "HOT" | "ARCHIVED" | "PURGED"
): string {
  switch (state) {
    case "HOT":
      return "原始 xlsx";
    case "ARCHIVED":
      return "已壓縮 tar.gz";
    case "PURGED":
      return "已清除";
  }
}
