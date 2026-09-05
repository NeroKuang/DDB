import { describe, expect, it } from "vitest";
import {
  buildNoteItemUnitPriceMap,
  mergeNoteOuterItems,
  parseNoteOuterList,
} from "@/import/parse-note-analysis";
import { july2026FixturePaths } from "@/lib/july-2026-fixtures";

describe("parseNoteOuterList", () => {
  it("reads 累計加減價額 and derives unit price", async () => {
    const outer = await parseNoteOuterList(july2026FixturePaths().noteOuter);
    expect(outer.length).toBeGreaterThan(0);
    const rooting = outer.find((item) => item.name === "修女貪杯");
    expect(rooting).toBeTruthy();
    expect(rooting!.clicks).toBeGreaterThan(0);
    expect(rooting!.priceTotal).toBeGreaterThan(0);

    const prices = buildNoteItemUnitPriceMap(outer);
    const unit = prices.get("修女貪杯") ?? 0;
    expect(unit).toBeGreaterThan(0);
    expect(unit).toBeCloseTo(rooting!.priceTotal / rooting!.clicks, 5);
  });

  it("merges duplicate outer rows before deriving unit price", () => {
    const prices = buildNoteItemUnitPriceMap([
      { name: "紅茶", clicks: 10, priceTotal: 1000 },
      { name: "紅茶", clicks: 5, priceTotal: 500 },
    ]);
    expect(prices.get("紅茶")).toBe(100);
  });
});
