import path from "path";
import {
  itemNameFromDrilldownFilename,
  parseNoteOuterList,
} from "@/import/parse-note-analysis";
import { listStoredIchefPaths } from "@/import/load-stored-ichef";
import {
  JULY_2026_FILE_RANGE,
  july2026FixturePaths,
} from "@/lib/july-2026-fixtures";

/** Suggest exact iCHEF item names from note outer / stored drill-downs. */
export async function suggestNoteItemNames(
  root = process.cwd()
): Promise<string[]> {
  const names = new Set<string>();
  const stored = listStoredIchefPaths(JULY_2026_FILE_RANGE, root);
  if (stored?.noteOuter) {
    try {
      for (const row of await parseNoteOuterList(stored.noteOuter)) {
        if (row.name) {
          names.add(row.name);
        }
      }
    } catch {
      // fall through to drill-down / fixture names
    }
  }
  const drillPaths =
    stored?.noteDrilldowns ?? july2026FixturePaths(root).noteDrilldowns;
  for (const filePath of drillPaths) {
    const name = itemNameFromDrilldownFilename(filePath);
    if (name && !path.basename(name).startsWith(".")) {
      names.add(name);
    }
  }
  if (!stored?.noteOuter) {
    try {
      for (const row of await parseNoteOuterList(
        july2026FixturePaths(root).noteOuter
      )) {
        if (row.name) {
          names.add(row.name);
        }
      }
    } catch {
      // ignore missing fixture outer
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}
