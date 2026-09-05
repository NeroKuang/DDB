import { describe, expect, it } from "vitest";
import {
  haystackIncludes,
  listRangeLabel,
  paginateItems,
  totalPages,
} from "@/components/list-controls";

describe("list-controls", () => {
  it("paginates items", () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginateItems(items, 1, 2)).toEqual([1, 2]);
    expect(paginateItems(items, 2, 2)).toEqual([3, 4]);
    expect(paginateItems(items, 3, 2)).toEqual([5]);
  });

  it("returns all items when page size is 0", () => {
    expect(paginateItems([1, 2, 3], 1, 0)).toEqual([1, 2, 3]);
  });

  it("computes total pages", () => {
    expect(totalPages(0, 10)).toBe(1);
    expect(totalPages(25, 10)).toBe(3);
    expect(totalPages(25, 0)).toBe(1);
  });

  it("formats range label", () => {
    expect(listRangeLabel(1, 10, 25)).toBe("第 1–10 筆，共 25 筆");
    expect(listRangeLabel(2, 10, 25, 30)).toBe(
      "第 11–20 筆，共 25 筆（全部 30 筆）"
    );
  });

  it("matches haystack search", () => {
    expect(haystackIncludes("祤晞 店長", "店長")).toBe(true);
    expect(haystackIncludes("祤晞", "xyz")).toBe(false);
    expect(haystackIncludes("anything", "")).toBe(true);
  });
});
