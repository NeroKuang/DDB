import { describe, expect, it } from "vitest";
import {
  boundsForBusinessDateRange,
  businessDateOf,
  enumerateBusinessDates,
  ichefFileRangeForBusinessDate,
  isInPayPeriod,
  parseIchefDateTime,
  periodKeyForBusinessDate,
} from "@/lib/business-day";
import { businessDaysForCalendarMonth } from "@/lib/pay-period-calendar";

describe("business-day noon cut", () => {
  const june = businessDaysForCalendarMonth("2026-06");
  const july = businessDaysForCalendarMonth("2026-07");
  const juneStart = new Date(june.startIso);
  const juneEnd = new Date(june.endIso);
  const julyStart = new Date(july.startIso);
  const julyEnd = new Date(july.endIso);

  it("assigns 7/1 11:59 to June and 7/1 12:00 to July", () => {
    const beforeNoon = parseIchefDateTime("2026/07/01 11:59:59");
    const atNoon = parseIchefDateTime("2026/07/01 12:00:00");
    expect(beforeNoon).not.toBeNull();
    expect(atNoon).not.toBeNull();
    expect(isInPayPeriod(beforeNoon!, juneStart, juneEnd)).toBe(true);
    expect(isInPayPeriod(beforeNoon!, julyStart, julyEnd)).toBe(false);
    expect(isInPayPeriod(atNoon!, juneStart, juneEnd)).toBe(false);
    expect(isInPayPeriod(atNoon!, julyStart, julyEnd)).toBe(true);
  });

  it("excludes mid-July checkout from June period", () => {
    const midJuly = parseIchefDateTime("2026/07/15 20:00:00");
    expect(midJuly).not.toBeNull();
    expect(isInPayPeriod(midJuly!, juneStart, juneEnd)).toBe(false);
    expect(isInPayPeriod(midJuly!, julyStart, julyEnd)).toBe(true);
  });
});

describe("businessDateOf / range helpers (noon cut)", () => {
  it("maps overnight checkout to previous calendar date as business date", () => {
    const at = parseIchefDateTime("2026/10/11 02:30:00");
    expect(at).not.toBeNull();
    expect(businessDateOf(at!)).toBe("2026-10-10");
  });

  it("maps 11:59:59 to previous business date and 12:00:00 to same calendar date", () => {
    const before = parseIchefDateTime("2026/10/11 11:59:59");
    const atNoon = parseIchefDateTime("2026/10/11 12:00:00");
    expect(before).not.toBeNull();
    expect(atNoon).not.toBeNull();
    expect(businessDateOf(before!)).toBe("2026-10-10");
    expect(businessDateOf(atNoon!)).toBe("2026-10-11");
  });

  it("boundsForBusinessDateRange is half-open noon windows inclusive of end date", () => {
    const bounds = boundsForBusinessDateRange("2026-10-10", "2026-10-12");
    expect(bounds.startIso).toBe("2026-10-10T12:00:00+08:00");
    expect(bounds.endIso).toBe("2026-10-13T12:00:00+08:00");
    const lateOnEnd = parseIchefDateTime("2026/10/13 11:59:59");
    const atNextNoon = parseIchefDateTime("2026/10/13 12:00:00");
    expect(lateOnEnd).not.toBeNull();
    expect(atNextNoon).not.toBeNull();
    expect(
      isInPayPeriod(
        lateOnEnd!,
        new Date(bounds.startIso),
        new Date(bounds.endIso)
      )
    ).toBe(true);
    expect(
      isInPayPeriod(
        atNextNoon!,
        new Date(bounds.startIso),
        new Date(bounds.endIso)
      )
    ).toBe(false);
  });

  it("enumerateBusinessDates is inclusive and crosses month", () => {
    expect(enumerateBusinessDates("2026-10-30", "2026-11-01")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("periodKeyForBusinessDate and ichefFileRangeForBusinessDate", () => {
    expect(periodKeyForBusinessDate("2026-10-10")).toBe("2026-10");
    expect(ichefFileRangeForBusinessDate("2026-10-10")).toEqual({
      startDate: "2026-10-10",
      endDate: "2026-10-11",
    });
  });
});

describe("previousCompletedBusinessDate", () => {
  it("excludes the still-open business day after noon", async () => {
    const { previousCompletedBusinessDate } =
      await import("@/range/daily-fetch-manage");
    // 2026-10-19 16:00 Taipei → open day 10/19 → last completed 10/18
    expect(
      previousCompletedBusinessDate(new Date("2026-10-19T16:00:00+08:00"))
    ).toBe("2026-10-18");
    // 2026-10-19 10:00 → still in open day 10/18 → last completed 10/17
    expect(
      previousCompletedBusinessDate(new Date("2026-10-19T10:00:00+08:00"))
    ).toBe("2026-10-17");
  });
});
