import { describe, expect, it } from "vitest";
import { analyzePosItemHealth } from "@/pos-items/health";
import type { StoredPosItem } from "@/pos-items/manage";

function item(
  partial: Partial<StoredPosItem> & Pick<StoredPosItem, "name">
): StoredPosItem {
  return {
    id: partial.id ?? "1",
    name: partial.name,
    unitPrice: partial.unitPrice ?? 0,
    isGift: partial.isGift ?? false,
    lastSeenAt: partial.lastSeenAt ?? new Date(),
  };
}

describe("analyzePosItemHealth", () => {
  it("ignores gift items when counting zero-price warnings", () => {
    const health = analyzePosItemHealth([
      item({ name: "修女貪杯", unitPrice: 100 }),
      item({ name: "兌換券", unitPrice: 0, isGift: true }),
    ]);
    expect(health.zeroPriceBillableCount).toBe(0);
    expect(health.giftCount).toBe(1);
  });

  it("suggests bulk import when all billable prices are zero", () => {
    const health = analyzePosItemHealth([
      item({ name: "A" }),
      item({ name: "B" }),
      item({ name: "兌換券", isGift: true }),
    ]);
    expect(health.allBillableZero).toBe(true);
    expect(health.suggestion).toContain("從匯入建議售價");
  });
});
