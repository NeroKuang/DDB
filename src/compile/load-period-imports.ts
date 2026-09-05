import type { CheckoutNoteLine } from "@/import/parse-checkout";
import type {
  NoteAnalysisClick,
  NoteOuterItem,
} from "@/import/parse-note-analysis";
import type { PunchPair } from "@/import/parse-punches";
import { getPeriodCatalogEntry } from "@/compile/period-catalog";
import { parseCheckoutFile } from "@/import/parse-checkout";
import { loadPerformanceFilesPreferringStorage } from "@/import/load-stored-ichef";
import {
  itemNameFromDrilldownFilename,
  parseNoteDrilldown,
  parseNoteOuterList,
} from "@/import/parse-note-analysis";
import { parsePunchFile } from "@/import/parse-punches";

export type PeriodImportBundle = {
  periodKey: string;
  source: "storage" | "fixture" | "db";
  noteDrilldownsFromFixtureFallback: boolean;
  checkoutLines: CheckoutNoteLine[];
  punchPairs: PunchPair[];
  noteClicks: NoteAnalysisClick[];
  noteOuterItems: NoteOuterItem[];
  noteOuterComplete: boolean;
};

/** Load and parse iCHEF files for one 薪資期間 (DB preferred, then storage, fixture). */
export async function loadPeriodImports(
  periodKey: string,
  options?: { storeId?: string }
): Promise<PeriodImportBundle> {
  if (options?.storeId) {
    const { loadImportFromDb } =
      await import("@/import/ingest/load-import-from-db");
    const fromDb = await loadImportFromDb(options.storeId, periodKey);
    if (fromDb) {
      return fromDb;
    }
  }

  const catalog = getPeriodCatalogEntry(periodKey);
  const files = await loadPerformanceFilesPreferringStorage(catalog.fileRange, {
    periodKey,
  });
  const period = {
    start: new Date(catalog.businessDays.startIso),
    end: new Date(catalog.businessDays.endIso),
  };
  if (!files?.punches) {
    throw new Error(
      periodKey === "2026-07"
        ? "打卡檔缺失，無法編成薪資報表"
        : `本期（${periodKey}）尚無 iCHEF 匯入，請先對該月執行網頁取數或上傳。`
    );
  }
  const checkoutLines = await parseCheckoutFile(files.checkout, period);
  const punches = await parsePunchFile(files.punches, period);
  const noteClicks = (
    await Promise.all(
      files.noteDrilldowns.map((filePath) =>
        parseNoteDrilldown(filePath, itemNameFromDrilldownFilename(filePath))
      )
    )
  ).flat();

  let noteOuterComplete = false;
  let noteOuterItems: NoteOuterItem[] = [];
  if (files.noteOuter) {
    try {
      const drilldownNames = files.noteDrilldowns.map((filePath) =>
        itemNameFromDrilldownFilename(filePath)
      );
      const outer = await parseNoteOuterList(files.noteOuter, drilldownNames);
      noteOuterItems = outer;
      const outerNames = new Set(outer.map((item) => item.name));
      const drillNames = new Set(
        files.noteDrilldowns.map((filePath) =>
          itemNameFromDrilldownFilename(filePath)
        )
      );
      noteOuterComplete =
        outerNames.size > 0 &&
        [...outerNames].every((name) => drillNames.has(name));
    } catch {
      noteOuterComplete = false;
    }
  }

  return {
    periodKey,
    source: files.source,
    noteDrilldownsFromFixtureFallback: files.noteDrilldownsFromFixtureFallback,
    checkoutLines,
    punchPairs: punches.pairs,
    noteClicks,
    noteOuterItems,
    noteOuterComplete,
  };
}
