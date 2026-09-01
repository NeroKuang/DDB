import { cpSync, mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import ExcelJS from "exceljs";
import {
  JULY_2026_FILE_RANGE,
  july2026FixturePaths,
} from "@/lib/july-2026-fixtures";
import {
  listStoredIchefPaths,
  loadPerformanceFilesPreferringStorage,
  resolveNoteDrilldownPaths,
} from "@/import/load-stored-ichef";

async function writeHeaderOnlyXlsx(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(["名稱", "註記比率", "點選數", "累計加減價額"]);
  await workbook.xlsx.writeFile(filePath);
}

describe("loadPerformanceFilesPreferringStorage", () => {
  it("lists checkout and every note drill-down under storage/ichef/<range>", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ddb-perf-storage-"));
    const fixtures = july2026FixturePaths();
    const dir = path.join(
      root,
      "storage",
      "ichef",
      `${JULY_2026_FILE_RANGE.startDate}_${JULY_2026_FILE_RANGE.endDate}`
    );
    try {
      mkdirSync(dir, { recursive: true });
      cpSync(
        fixtures.checkout,
        path.join(dir, "結帳_作廢紀錄_2026-06-30~2026-08-01.xlsx")
      );
      cpSync(
        fixtures.punches,
        path.join(dir, "打卡紀錄_2026-06-30~2026-08-01.xlsx")
      );
      cpSync(
        fixtures.noteOuter,
        path.join(dir, "modifier-analysis_2026-06-30~2026-08-01.xlsx")
      );
      cpSync(
        fixtures.noteDrilldowns[0]!,
        path.join(dir, "修女貪杯_2026-06-30~2026-08-01.xlsx")
      );
      cpSync(
        fixtures.noteDrilldowns[1]!,
        path.join(dir, "傳統禱告拍立得_2026-06-30~2026-08-01.xlsx")
      );
      cpSync(
        fixtures.noteDrilldowns[0]!,
        path.join(dir, "合照_2026-06-30~2026-08-01.xlsx")
      );

      const listed = listStoredIchefPaths(JULY_2026_FILE_RANGE, root);
      expect(listed?.checkout).toContain("結帳_作廢紀錄");
      expect(listed?.noteDrilldowns).toHaveLength(3);
      expect(
        listed?.noteDrilldowns.some((p) => path.basename(p).startsWith("合照_"))
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("prefers storage files when checkout exists, else fixture paths", async () => {
    const storageRoot = mkdtempSync(path.join(tmpdir(), "ddb-perf-pref-"));
    const fixtures = july2026FixturePaths();
    try {
      const missing = await loadPerformanceFilesPreferringStorage(
        JULY_2026_FILE_RANGE,
        storageRoot
      );
      expect(missing.source).toBe("fixture");
      expect(missing.checkout).toBe(fixtures.checkout);

      const dir = path.join(
        storageRoot,
        "storage",
        "ichef",
        `${JULY_2026_FILE_RANGE.startDate}_${JULY_2026_FILE_RANGE.endDate}`
      );
      mkdirSync(dir, { recursive: true });
      const storedCheckout = path.join(
        dir,
        "結帳_作廢紀錄_2026-06-30~2026-08-01.xlsx"
      );
      cpSync(fixtures.checkout, storedCheckout);
      cpSync(
        fixtures.noteDrilldowns[0]!,
        path.join(dir, "修女貪杯_2026-06-30~2026-08-01.xlsx")
      );

      const preferred = await loadPerformanceFilesPreferringStorage(
        JULY_2026_FILE_RANGE,
        storageRoot
      );
      expect(preferred.source).toBe("storage");
      expect(preferred.checkout).toBe(storedCheckout);
      expect(preferred.noteDrilldowns).toHaveLength(1);
      expect(preferred.noteDrilldownsFromFixtureFallback).toBe(false);
    } finally {
      rmSync(storageRoot, { recursive: true, force: true });
    }
  });

  it("falls back to fixture note drill-downs when storage ones are header-only", async () => {
    const storageRoot = mkdtempSync(path.join(tmpdir(), "ddb-perf-empty-"));
    const fixtures = july2026FixturePaths();
    const dir = path.join(
      storageRoot,
      "storage",
      "ichef",
      `${JULY_2026_FILE_RANGE.startDate}_${JULY_2026_FILE_RANGE.endDate}`
    );
    try {
      mkdirSync(dir, { recursive: true });
      cpSync(
        fixtures.checkout,
        path.join(dir, "結帳_作廢紀錄_2026-06-30~2026-08-01.xlsx")
      );
      await writeHeaderOnlyXlsx(
        path.join(dir, "修女貪杯_2026-06-30~2026-08-01.xlsx")
      );

      const resolved = await resolveNoteDrilldownPaths(
        [path.join(dir, "修女貪杯_2026-06-30~2026-08-01.xlsx")],
        fixtures.noteDrilldowns
      );
      expect(resolved.usedFallback).toBe(true);
      expect(resolved.paths).toEqual(fixtures.noteDrilldowns);

      const files = await loadPerformanceFilesPreferringStorage(
        JULY_2026_FILE_RANGE,
        storageRoot
      );
      expect(files.source).toBe("storage");
      expect(files.noteDrilldownsFromFixtureFallback).toBe(true);
      expect(files.noteDrilldowns).toEqual(fixtures.noteDrilldowns);
    } finally {
      rmSync(storageRoot, { recursive: true, force: true });
    }
  });
});
