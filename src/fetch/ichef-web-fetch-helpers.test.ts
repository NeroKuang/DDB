import { describe, expect, it } from "vitest";
import { isModifierAnalysisOuterFilename } from "@/fetch/ichef-web-fetch";
import { normalizeNoteItemName } from "@/import/parse-note-analysis";

describe("ichef web fetch helpers", () => {
  it("accepts modifier-analysis outer filenames", () => {
    expect(
      isModifierAnalysisOuterFilename(
        "modifier-analysis_2026-07-31~2026-09-01.xlsx"
      )
    ).toBe(true);
  });

  it("rejects 文字註記分析 outer filenames", () => {
    expect(
      isModifierAnalysisOuterFilename("文字註記分析_2026-07-31~2026-09-01.xlsx")
    ).toBe(false);
  });

  it("normalizeNoteItemName aligns punctuation variants", () => {
    expect(normalizeNoteItemName("傳統禱告（拍立得）")).toBe(
      normalizeNoteItemName("傳統禱告拍立得")
    );
  });
});
