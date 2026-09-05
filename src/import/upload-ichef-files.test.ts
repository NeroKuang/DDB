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

  it("rejects 文字註記分析 as note outer (staff summary, not product list)", () => {
    const files = [
      {
        filename: "結帳／作廢紀錄_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("a"),
      },
      {
        filename: "打卡紀錄_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("b"),
      },
      {
        filename: "文字註記分析_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("c"),
      },
      {
        filename: "修女貪杯_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("d"),
      },
    ];
    const result = classifyUploadedFiles(files);
    expect(result.noteOuter).toBeUndefined();
    expect(
      result.unknown.some((f) => f.filename.startsWith("文字註記分析"))
    ).toBe(true);
    expect(() => validateUploadSet(files)).toThrow(/modifier-analysis/);
  });

  it("keeps modifier-analysis as outer when 文字註記分析 appears as a drill-down filename", () => {
    const files = [
      {
        filename: "結帳／作廢紀錄_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("a"),
      },
      {
        filename: "打卡紀錄_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("b"),
      },
      {
        filename: "modifier-analysis_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("c"),
      },
      {
        filename: "文字註記分析_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("d"),
      },
      {
        filename: "修女貪杯_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("e"),
      },
    ];
    const result = classifyUploadedFiles(files);
    expect(result.noteOuter?.filename).toContain("modifier-analysis");
    expect(
      result.drilldowns.some((f) => f.filename.startsWith("文字註記分析"))
    ).toBe(true);
    expect(() => validateUploadSet(files)).not.toThrow();
  });

  it("prefers modifier-analysis when listed after 文字註記分析", () => {
    const result = classifyUploadedFiles([
      {
        filename: "結帳／作廢紀錄_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("a"),
      },
      {
        filename: "打卡紀錄_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("b"),
      },
      {
        filename: "文字註記分析_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("c"),
      },
      {
        filename: "modifier-analysis_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("d"),
      },
      {
        filename: "修女貪杯_2026-07-31~2026-09-01.xlsx",
        bytes: Buffer.from("e"),
      },
    ]);
    expect(result.noteOuter?.filename).toContain("modifier-analysis");
    expect(
      result.drilldowns.some((f) => f.filename.startsWith("文字註記分析"))
    ).toBe(true);
    expect(result.unknown).toHaveLength(0);
    expect(() =>
      validateUploadSet([
        {
          filename: "結帳／作廢紀錄_2026-07-31~2026-09-01.xlsx",
          bytes: Buffer.from("a"),
        },
        {
          filename: "打卡紀錄_2026-07-31~2026-09-01.xlsx",
          bytes: Buffer.from("b"),
        },
        {
          filename: "文字註記分析_2026-07-31~2026-09-01.xlsx",
          bytes: Buffer.from("c"),
        },
        {
          filename: "modifier-analysis_2026-07-31~2026-09-01.xlsx",
          bytes: Buffer.from("d"),
        },
        {
          filename: "修女貪杯_2026-07-31~2026-09-01.xlsx",
          bytes: Buffer.from("e"),
        },
      ])
    ).not.toThrow();
  });

  it("rejects incomplete upload sets", () => {
    expect(() =>
      validateUploadSet([{ filename: "結帳.xlsx", bytes: Buffer.from("a") }])
    ).toThrow(/打卡/);
  });
});
