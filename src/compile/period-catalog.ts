import type { ShopInputs } from "@/compile/types";
import { zhongshanEmptyShop } from "@/compile/zhongshan-empty-shop";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import {
  assertValidPeriodKey,
  businessDaysForCalendarMonth,
  fileRangeForCalendarMonth,
} from "@/lib/pay-period-calendar";
import {
  JULY_2026_FILE_RANGE,
  JULY_2026_PERIOD,
} from "@/lib/july-2026-fixtures";

export type FileDateRange = {
  startDate: string;
  endDate: string;
};

export type BusinessDayBounds = {
  startIso: string;
  endIso: string;
};

/** Static catalog entry for one 薪資期間. */
export type PeriodCatalogEntry = {
  periodKey: string;
  businessDays: BusinessDayBounds;
  fileRange: FileDateRange;
  labelPrefix: string;
  fixtureShop: () => ShopInputs;
};

const JULY_2026_CATALOG: PeriodCatalogEntry = {
  periodKey: JULY_2026_PERIOD_KEY,
  businessDays: { ...JULY_2026_PERIOD },
  fileRange: { ...JULY_2026_FILE_RANGE },
  labelPrefix: "2026-07（中山",
  fixtureShop: zhongshanJuly2026Shop,
};

export function getPeriodCatalogEntry(periodKey: string): PeriodCatalogEntry {
  assertValidPeriodKey(periodKey);
  if (periodKey === JULY_2026_PERIOD_KEY) {
    return JULY_2026_CATALOG;
  }
  return {
    periodKey,
    businessDays: businessDaysForCalendarMonth(periodKey),
    fileRange: fileRangeForCalendarMonth(periodKey),
    labelPrefix: `${periodKey}（中山`,
    fixtureShop: zhongshanEmptyShop,
  };
}

export function fileRangeForPeriodKey(periodKey: string): FileDateRange {
  return getPeriodCatalogEntry(periodKey).fileRange;
}

export function businessDaysForPeriodKey(periodKey: string): BusinessDayBounds {
  return getPeriodCatalogEntry(periodKey).businessDays;
}

export function periodLabelForImportSource(
  periodKey: string,
  source: "storage" | "fixture" | "db",
  noteDrilldownsFromFixtureFallback: boolean
): string {
  const { labelPrefix } = getPeriodCatalogEntry(periodKey);
  if (source === "db") {
    return `${labelPrefix}・DB 匯入）`;
  }
  if (source === "fixture") {
    return `${labelPrefix}・fixture）`;
  }
  if (noteDrilldownsFromFixtureFallback) {
    return `${labelPrefix}・網頁取數；注記暫用 fixture）`;
  }
  return `${labelPrefix}・網頁取數）`;
}
