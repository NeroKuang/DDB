import { describe, expect, it } from "vitest";
import {
  currentCalendarMonthKey,
  enumeratePeriodKeys,
} from "@/cron/backfill-pay-periods";

describe("enumeratePeriodKeys", () => {
  it("lists inclusive months", () => {
    expect(enumeratePeriodKeys("2026-07", "2026-10")).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("allows single month", () => {
    expect(enumeratePeriodKeys("2026-07", "2026-07")).toEqual(["2026-07"]);
  });

  it("rejects inverted range", () => {
    expect(() => enumeratePeriodKeys("2026-10", "2026-07")).toThrow(/起迄/);
  });
});

describe("currentCalendarMonthKey", () => {
  it("formats YYYY-MM", () => {
    expect(currentCalendarMonthKey(new Date("2026-10-19T12:00:00+08:00"))).toBe(
      "2026-10"
    );
  });
});
