import { readFileSync } from "fs";
import type { FetchedIchefFiles } from "@/fetch/ichef-web-fetch";
import { itemNameFromDrilldownFilename } from "@/import/parse-note-analysis";
import type { UploadFileInput } from "@/import/upload-ichef-files";
import { july2026FixturePaths } from "@/lib/july-2026-fixtures";

function readXlsx(filePath: string): { filename: string; bytes: Buffer } {
  return {
    filename: filePath.split("/").pop() ?? filePath,
    bytes: readFileSync(filePath),
  };
}

/** Load checked-in July fixture xlsx as in-memory fetch result (tests / ingest). */
export function julyFixturesAsFetched(root = process.cwd()): FetchedIchefFiles {
  const paths = july2026FixturePaths(root);
  return {
    checkout: readXlsx(paths.checkout),
    punches: readXlsx(paths.punches),
    noteOuter: readXlsx(paths.noteOuter),
    noteDrilldowns: paths.noteDrilldowns.map((filePath) => ({
      itemName: itemNameFromDrilldownFilename(filePath),
      file: readXlsx(filePath),
    })),
  };
}

export function julyFixturesAsUploadInputs(
  root = process.cwd()
): UploadFileInput[] {
  const fetched = julyFixturesAsFetched(root);
  return [
    fetched.checkout,
    fetched.punches,
    fetched.noteOuter,
    ...fetched.noteDrilldowns.map((item) => item.file),
  ];
}
