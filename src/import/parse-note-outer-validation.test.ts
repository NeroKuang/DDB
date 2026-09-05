import { describe, expect, it } from "vitest";
import {
  isUsableNoteOuterForPricing,
  mergeNoteOuterItems,
  noteOuterMatchesDrilldowns,
  noteOuterNamesMissingDrilldowns,
  parseNoteOuterFromSheets,
  parseNoteOuterProductSheetFromSheets,
  encodeNoteItemNameForFilename,
  decodeNoteItemNameFromFilename,
  itemNameFromDrilldownFilename,
} from "@/import/parse-note-analysis";

describe("note outer pricing validation", () => {
  const drilldownItems = ["修女貪杯", "合照", "傳統禱告拍立得"];

  it("rejects staff-nickname mistaken as outer list", () => {
    const staffSummary = mergeNoteOuterItems([
      { name: "乙醚", clicks: 4, priceTotal: 0 },
      { name: "恋雪", clicks: 12, priceTotal: 0 },
    ]);
    expect(isUsableNoteOuterForPricing(staffSummary, drilldownItems)).toBe(
      false
    );
  });

  it("accepts item-level outer aligned with drill-downs", () => {
    const items = mergeNoteOuterItems([
      { name: "修女貪杯", clicks: 20, priceTotal: 2000 },
      { name: "合照", clicks: 10, priceTotal: 5000 },
      { name: "傳統禱告拍立得", clicks: 5, priceTotal: 2500 },
    ]);
    expect(isUsableNoteOuterForPricing(items, drilldownItems)).toBe(true);
  });

  it("parseNoteOuterFromSheets picks the sheet matching drill-down items", () => {
    const picked = parseNoteOuterFromSheets(
      [
        [
          ["名稱", "點選數", "累計加減價額"],
          ["乙醚", "4", "0"],
          ["恋雪", "12", "0"],
        ],
        [
          ["名稱", "點選數", "累計加減價額"],
          ["修女貪杯", "20", "2000"],
          ["合照", "10", "5000"],
        ],
      ],
      drilldownItems
    );
    expect(picked.find((row) => row.name === "修女貪杯")?.priceTotal).toBe(
      2000
    );
  });

  it("noteOuterMatchesDrilldowns requires same name set (normalized)", () => {
    const outer = [{ name: "修女貪杯", clicks: 1, priceTotal: 100 }];
    expect(noteOuterMatchesDrilldowns(outer, ["修女貪杯", "合照"])).toBe(false);
    expect(
      noteOuterMatchesDrilldowns(
        [
          { name: "修女貪杯", clicks: 1, priceTotal: 100 },
          { name: "合照", clicks: 1, priceTotal: 100 },
        ],
        ["修女貪杯", "合照"]
      )
    ).toBe(true);
    expect(
      noteOuterMatchesDrilldowns(
        [
          {
            name: "初醉套餐（薯條/唐揚雞+任意厚片+軟飲+拍立得）",
            clicks: 1,
            priceTotal: 1,
          },
        ],
        ["初醉套餐（薯條∕唐揚雞+任意厚片+軟飲+拍立得）"]
      )
    ).toBe(true);
  });

  it("encode/decode note item filename round-trips slash", () => {
    const name = "初醉套餐（薯條/唐揚雞+任意厚片+軟飲+拍立得）";
    const encoded = encodeNoteItemNameForFilename(name);
    expect(encoded.includes("/")).toBe(false);
    expect(decodeNoteItemNameFromFilename(encoded)).toBe(name);
    expect(
      itemNameFromDrilldownFilename(`${encoded}_2026-07-31~2026-09-01.xlsx`)
    ).toBe(name);
  });

  it("parseNoteOuterProductSheetFromSheets prefers largest product sheet", () => {
    const picked = parseNoteOuterProductSheetFromSheets(
      [
        [
          ["名稱", "點選數", "累計加減價額"],
          ["乙醚", "4", "0"],
          ["恋雪", "12", "0"],
        ],
        [
          ["名稱", "點選數", "累計加減價額"],
          ["修女貪杯", "20", "2000"],
          ["合照", "10", "5000"],
          ["就這麼做著純白的夢(白天使香檳+蛋糕)", "2", "8000"],
        ],
      ],
      ["修女貪杯", "合照"]
    );
    expect(picked).toHaveLength(3);
    expect(
      picked.some((row) => row.name.startsWith("就這麼做著純白的夢"))
    ).toBe(true);
  });

  it("noteOuterNamesMissingDrilldowns lists outer-only names", () => {
    expect(
      noteOuterNamesMissingDrilldowns(
        [
          { name: "修女貪杯", clicks: 1, priceTotal: 100 },
          {
            name: "初次的夢見(活動限定信徒搶杯，可無酒精)",
            clicks: 1,
            priceTotal: 200,
          },
        ],
        ["修女貪杯"]
      )
    ).toEqual(["初次的夢見(活動限定信徒搶杯，可無酒精)"]);
  });
});
