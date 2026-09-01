import { describe, expect, it } from "vitest";
import { computeTemplateTaskBonus } from "@/template-tasks/compute";

describe("computeTemplateTaskBonus", () => {
  it("sums 單筆任務獎金 and cumulative 任務達標 tiers", () => {
    const result = computeTemplateTaskBonus(20, {
      amountPerClick: 50,
      tiers: [
        { minClicks: 10, bonusAmount: 500 },
        { minClicks: 20, bonusAmount: 300 },
      ],
    });
    expect(result.perClickBonus).toBe(1000);
    expect(result.targetBonus).toBe(800);
    expect(result.total).toBe(1800);
  });

  it("allows per-click only or 任務達標 only", () => {
    expect(
      computeTemplateTaskBonus(3, { amountPerClick: 50, tiers: [] })
    ).toEqual({ perClickBonus: 150, targetBonus: 0, total: 150 });

    expect(
      computeTemplateTaskBonus(12, {
        amountPerClick: 0,
        tiers: [
          { minClicks: 10, bonusAmount: 500 },
          { minClicks: 20, bonusAmount: 300 },
        ],
      })
    ).toEqual({ perClickBonus: 0, targetBonus: 500, total: 500 });
  });

  it("pays no 任務達標 when under the lowest tier", () => {
    expect(
      computeTemplateTaskBonus(9, {
        amountPerClick: 10,
        tiers: [{ minClicks: 10, bonusAmount: 500 }],
      })
    ).toEqual({ perClickBonus: 90, targetBonus: 0, total: 90 });
  });
});
