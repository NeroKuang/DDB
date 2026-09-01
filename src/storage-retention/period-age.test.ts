import { describe, expect, it } from "vitest";
import {
  monthsSincePeriodKey,
  retentionPhaseForAge,
} from "@/storage-retention/period-age";

describe("monthsSincePeriodKey", () => {
  it("counts calendar months in Asia/Taipei", () => {
    const now = new Date("2026-09-15T12:00:00+08:00");
    expect(monthsSincePeriodKey("2026-07", now)).toBe(2);
    expect(monthsSincePeriodKey("2026-04", now)).toBe(5);
    expect(monthsSincePeriodKey("2025-06", now)).toBe(15);
  });
});

describe("retentionPhaseForAge", () => {
  it("maps ADR-0083 tiers", () => {
    expect(retentionPhaseForAge(0)).toBe("hot");
    expect(retentionPhaseForAge(3)).toBe("hot");
    expect(retentionPhaseForAge(4)).toBe("archive");
    expect(retentionPhaseForAge(12)).toBe("archive");
    expect(retentionPhaseForAge(13)).toBe("purge");
  });
});
