import { existsSync, readdirSync } from "fs";
import path from "path";
import { storageDirForFetchRange } from "@/fetch/save-fetched-to-storage";
import { isNoteOuterFilename } from "@/import/upload-ichef-files";
import { readFirstSheetRows } from "@/import/read-xlsx-sheet";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import { july2026FixturePaths } from "@/lib/july-2026-fixtures";

export type StoredIchefPaths = {
  checkout: string;
  punches?: string;
  noteOuter?: string;
  noteDrilldowns: string[];
  /** storage/ichef/<start>_<end> folder that supplied these files. */
  storageRange: { startDate: string; endDate: string };
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

function parseStorageRangeDir(
  name: string
): { startDate: string; endDate: string } | null {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/);
  if (!match) {
    return null;
  }
  return { startDate: match[1], endDate: match[2] };
}

function rangesOverlap(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string }
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

function listStoredIchefPathsInDir(
  range: { startDate: string; endDate: string },
  root: string
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
  const noteOuterName = names.find((name) => isNoteOuterFilename(name));
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
    storageRange: range,
  };
}

/** Discover 網頁取數 files under storage/ichef/<start>_<end> (exact range). */
export function listStoredIchefPaths(
  range: { startDate: string; endDate: string },
  root = process.cwd()
): StoredIchefPaths | null {
  return listStoredIchefPathsInDir(range, root);
}

/** Find a stored export whose file-range overlaps the requested iCHEF window. */
export function findOverlappingStoredIchefPaths(
  range: { startDate: string; endDate: string },
  root = process.cwd()
): StoredIchefPaths | null {
  const ichefRoot = path.join(root, "storage", "ichef");
  if (!existsSync(ichefRoot)) {
    return null;
  }
  const candidates = readdirSync(ichefRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => parseStorageRangeDir(entry.name))
    .filter((parsed): parsed is { startDate: string; endDate: string } =>
      Boolean(parsed && rangesOverlap(parsed, range))
    )
    .sort((a, b) => {
      const widthA = a.endDate.localeCompare(a.startDate);
      const widthB = b.endDate.localeCompare(b.startDate);
      if (a.endDate !== b.endDate) {
        return b.endDate.localeCompare(a.endDate);
      }
      return widthA - widthB;
    });

  for (const candidate of candidates) {
    const found = listStoredIchefPathsInDir(candidate, root);
    if (found) {
      return found;
    }
  }
  return null;
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
 * Prefer live 網頁取數 under storage/ (exact or overlapping range).
 * July checked-in fixtures are only used for 2026-07 regression, not other months.
 */
export async function loadPerformanceFilesPreferringStorage(
  range: { startDate: string; endDate: string },
  options?: { periodKey?: string; storageRoot?: string; fixtureRoot?: string }
): Promise<PerformanceFileSet | null> {
  const storageRoot = options?.storageRoot ?? process.cwd();
  const fixtureRoot = options?.fixtureRoot ?? process.cwd();
  const periodKey = options?.periodKey;
  const fixtures = july2026FixturePaths(fixtureRoot);

  const stored =
    listStoredIchefPaths(range, storageRoot) ??
    findOverlappingStoredIchefPaths(range, storageRoot);

  if (!stored) {
    if (periodKey === JULY_2026_PERIOD_KEY || !periodKey) {
      return {
        source: "fixture",
        checkout: fixtures.checkout,
        punches: fixtures.punches,
        noteOuter: fixtures.noteOuter,
        noteDrilldowns: fixtures.noteDrilldowns,
        noteDrilldownsFromFixtureFallback: false,
      };
    }
    return null;
  }

  const noteFallback =
    periodKey === JULY_2026_PERIOD_KEY ? fixtures.noteDrilldowns : [];
  const notes = await resolveNoteDrilldownPaths(
    stored.noteDrilldowns,
    noteFallback
  );
  return {
    source: "storage",
    checkout: stored.checkout,
    punches: stored.punches,
    noteOuter: stored.noteOuter,
    noteDrilldowns: notes.paths,
    noteDrilldownsFromFixtureFallback: notes.usedFallback,
  };
}
