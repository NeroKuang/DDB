import { describe, expect, it } from "vitest";
import { previousCalendarMonthKey } from "@/cron/month-end-fetch";

describe("month-end-fetch", () => {
  it("computes previous calendar month in Taipei", () => {
    expect(
      previousCalendarMonthKey(new Date("2026-09-02T04:00:00+08:00"))
    ).toBe("2026-08");
    expect(
      previousCalendarMonthKey(new Date("2026-01-15T12:00:00+08:00"))
    ).toBe("2025-12");
  });
});
