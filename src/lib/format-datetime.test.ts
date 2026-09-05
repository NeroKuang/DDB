import { describe, expect, it } from "vitest";
import { formatTaipeiDateTime } from "@/lib/format-datetime";

describe("formatTaipeiDateTime", () => {
  it("formats with ASCII space (no unicode thin spaces)", () => {
    const text = formatTaipeiDateTime(new Date("2026-09-02T11:12:44Z"));
    expect(text).toBe("2026/9/2 下午7:12:44");
    expect(text).not.toMatch(/[\u2009\u202f\u00a0]/);
  });

  it("returns null for invalid input", () => {
    expect(formatTaipeiDateTime(null)).toBeNull();
    expect(formatTaipeiDateTime("not-a-date")).toBeNull();
  });
});
