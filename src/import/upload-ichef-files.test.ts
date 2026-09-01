import { describe, expect, it } from "vitest";
import {
  classifyUploadedFiles,
  validateUploadSet,
} from "@/import/upload-ichef-files";

describe("upload-ichef-files", () => {
  it("classifies checkout, punches, outer, and drilldowns", () => {
    const result = classifyUploadedFiles([
      {
        filename: "結帳／作廢紀錄_2026-06-30~2026-08-01.xlsx",
        bytes: Buffer.from("a"),
      },
      {
        filename: "打卡紀錄_2026-06-30~2026-08-01.xlsx",
        bytes: Buffer.from("b"),
      },
      {
        filename: "modifier-analysis_2026-06-30~2026-08-01.xlsx",
        bytes: Buffer.from("c"),
      },
      {
        filename: "修女貪杯_2026-06-30~2026-08-01.xlsx",
        bytes: Buffer.from("d"),
      },
    ]);
    expect(result.checkout?.filename).toContain("結帳");
    expect(result.punches?.filename).toContain("打卡");
    expect(result.noteOuter?.filename).toContain("modifier-analysis");
    expect(result.drilldowns).toHaveLength(1);
  });

  it("rejects incomplete upload sets", () => {
    expect(() =>
      validateUploadSet([{ filename: "結帳.xlsx", bytes: Buffer.from("a") }])
    ).toThrow(/打卡/);
  });
});
