import { describe, expect, it } from "vitest";
import { isInPayPeriod, parseIchefDateTime } from "@/lib/business-day";
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
