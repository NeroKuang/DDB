import { describe, expect, it } from "vitest";
import {
  guestPeriodDisplay,
  guestPeriodLabel,
  staffIncludedInPayPeriod,
} from "@/staff/guest-period";

describe("guest-period", () => {
  it("labels guest period", () => {
    expect(guestPeriodLabel("2026-07")).toBe("2026-07客座");
    expect(guestPeriodDisplay("2026-07")).toBe("2026 年 7 月客座");
  });

  it("includes regular always and guest only for matching period", () => {
    expect(
      staffIncludedInPayPeriod({
        kind: "regular",
        periodKey: "2026-07",
      })
    ).toBe(true);
    expect(
      staffIncludedInPayPeriod({
        kind: "guest",
        guestPeriodKey: "2026-07",
        periodKey: "2026-07",
      })
    ).toBe(true);
    expect(
      staffIncludedInPayPeriod({
        kind: "guest",
        guestPeriodKey: "2026-07",
        periodKey: "2026-08",
      })
    ).toBe(false);
    expect(
      staffIncludedInPayPeriod({
        kind: "guest",
        guestPeriodKey: null,
        periodKey: "2026-07",
      })
    ).toBe(false);
  });
});
