import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { JULY_2026_FILE_RANGE } from "@/lib/july-2026-fixtures";

export type FileDateRange = {
  startDate: string;
  endDate: string;
};

/** v1: only July 2026 is wired for 網頁取數. */
export function fileRangeForPeriodKey(periodKey: string): FileDateRange {
  if (periodKey === JULY_2026_PERIOD_KEY) {
    return { ...JULY_2026_FILE_RANGE };
  }
  throw new Error(`第一期僅支援 ${JULY_2026_PERIOD_KEY} 網頁取數`);
}
