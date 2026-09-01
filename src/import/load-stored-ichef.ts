import { existsSync, readdirSync } from "fs";
import path from "path";
import { storageDirForFetchRange } from "@/fetch/save-fetched-to-storage";
import { readFirstSheetRows } from "@/import/read-xlsx-sheet";
import { july2026FixturePaths } from "@/lib/july-2026-fixtures";

export type StoredIchefPaths = {
  checkout: string;
  punches?: string;
  noteOuter?: string;
  noteDrilldowns: string[];
};

export type PerformanceFileSet = {
  source: "storage" | "fixture";
  checkout: string;
  punches?: string;
  noteOuter?: string;
  noteDrilldowns: string[];
  /** True when checkout came from storage but note drill-downs fell back to fixtures. */
  noteDrilldownsFromFixtureFallback: boolean;
};

const NON_DRILLDOWN = /^(結帳|打卡紀錄|modifier-analysis|文字註記分析)/;

function isXlsx(name: string): boolean {
  return name.toLowerCase().endsWith(".xlsx");
}

/** Discover 網頁取數 files already saved under storage/ichef/<start>_<end>. */
export function listStoredIchefPaths(
  range: { startDate: string; endDate: string },
  root = process.cwd()
): StoredIchefPaths | null {
  const dir = storageDirForFetchRange(range, root);
  if (!existsSync(dir)) {
    return null;
  }
  const names = readdirSync(dir).filter(isXlsx);
  const checkoutName = names.find((name) => name.startsWith("結帳"));
  if (!checkoutName) {
    return null;
  }
  const punchesName = names.find((name) => name.startsWith("打卡紀錄"));
  const noteOuterName = names.find((name) =>
    name.startsWith("modifier-analysis")
  );
  const noteDrilldowns = names
    .filter((name) => !NON_DRILLDOWN.test(name))
    .map((name) => path.join(dir, name))
    .sort((a, b) =>
      path.basename(a).localeCompare(path.basename(b), "zh-Hant")
    );

  return {
    checkout: path.join(dir, checkoutName),
    punches: punchesName ? path.join(dir, punchesName) : undefined,
    noteOuter: noteOuterName ? path.join(dir, noteOuterName) : undefined,
    noteDrilldowns,
  };
}

/** Keep drill-downs that have at least one data row; else use fallback paths. */
export async function resolveNoteDrilldownPaths(
  preferred: string[],
  fallback: string[]
): Promise<{ paths: string[]; usedFallback: boolean }> {
  const withData: string[] = [];
  for (const filePath of preferred) {
    const rows = await readFirstSheetRows(filePath);
    if (rows.length > 1) {
      withData.push(filePath);
    }
  }
  if (withData.length > 0) {
    return { paths: withData, usedFallback: false };
  }
  if (preferred.length === 0) {
    return { paths: fallback, usedFallback: false };
  }
  return { paths: fallback, usedFallback: true };
}

/**
 * Prefer live 網頁取數 under storage/; fall back to checked-in July fixtures.
 * Empty note drill-downs (header-only xlsx from a bad fetch) fall back to fixture notes.
 */
export async function loadPerformanceFilesPreferringStorage(
  range: { startDate: string; endDate: string },
  storageRoot = process.cwd(),
  fixtureRoot = process.cwd()
): Promise<PerformanceFileSet> {
  const fixtures = july2026FixturePaths(fixtureRoot);
  const stored = listStoredIchefPaths(range, storageRoot);
  if (!stored) {
    return {
      source: "fixture",
      checkout: fixtures.checkout,
      punches: fixtures.punches,
      noteOuter: fixtures.noteOuter,
      noteDrilldowns: fixtures.noteDrilldowns,
      noteDrilldownsFromFixtureFallback: false,
    };
  }
  const notes = await resolveNoteDrilldownPaths(
    stored.noteDrilldowns,
    fixtures.noteDrilldowns
  );
  return {
    source: "storage",
    checkout: stored.checkout,
    punches: stored.punches ?? fixtures.punches,
    noteOuter: stored.noteOuter,
    noteDrilldowns: notes.paths,
    noteDrilldownsFromFixtureFallback: notes.usedFallback,
  };
}
