import { describe, expect, it } from "vitest";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import {
  businessDaysForCalendarMonth,
  fileRangeForCalendarMonth,
  isValidPeriodKey,
  periodKeyDisplayLabel,
} from "@/lib/pay-period-calendar";

describe("pay-period-calendar", () => {
  it("validates YYYY-MM keys", () => {
    expect(isValidPeriodKey("2026-07")).toBe(true);
    expect(isValidPeriodKey("2026-13")).toBe(false);
    expect(isValidPeriodKey("bad")).toBe(false);
  });

  it("matches July 2026 fixture bounds", () => {
    expect(businessDaysForCalendarMonth(JULY_2026_PERIOD_KEY)).toEqual({
      startIso: "2026-07-01T12:00:00+08:00",
      endIso: "2026-08-01T12:00:00+08:00",
    });
    expect(fileRangeForCalendarMonth(JULY_2026_PERIOD_KEY)).toEqual({
      startDate: "2026-06-30",
      endDate: "2026-08-01",
    });
  });

  it("computes August 2026 file range", () => {
    expect(fileRangeForCalendarMonth("2026-08")).toEqual({
      startDate: "2026-07-31",
      endDate: "2026-09-01",
    });
  });

  it("formats display label", () => {
    expect(periodKeyDisplayLabel("2026-07")).toBe("2026 年 7 月");
  });
});
