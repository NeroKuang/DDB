import { readFileSync } from "fs";
import type { FetchedIchefFiles } from "@/fetch/ichef-web-fetch";
import { itemNameFromDrilldownFilename } from "@/import/parse-note-analysis";
import { july2026FixturePaths } from "@/lib/july-2026-fixtures";

export function loadJuly2026FetchedFromFixtures(
  root = process.cwd()
): FetchedIchefFiles {
  const paths = july2026FixturePaths(root);
  return {
    checkout: {
      filename: "結帳／作廢紀錄_2026-06-30~2026-08-01.xlsx",
      bytes: readFileSync(paths.checkout),
    },
    punches: {
      filename: "打卡紀錄_2026-06-30~2026-08-01.xlsx",
      bytes: readFileSync(paths.punches),
    },
    noteOuter: {
      filename: "modifier-analysis_2026-06-30~2026-08-01.xlsx",
      bytes: readFileSync(paths.noteOuter),
    },
    noteDrilldowns: paths.noteDrilldowns.map((filePath) => ({
      itemName: itemNameFromDrilldownFilename(filePath),
      file: {
        filename: filePath.split("/").pop() ?? filePath,
        bytes: readFileSync(filePath),
      },
    })),
  };
}
