import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import type { FetchedIchefFiles } from "@/fetch/ichef-web-fetch";

export function storageDirForFetchRange(
  range: { startDate: string; endDate: string },
  root = process.cwd()
): string {
  return path.join(
    root,
    "storage",
    "ichef",
    `${range.startDate}_${range.endDate}`
  );
}

function safeFilename(name: string): string {
  return name.replace(/[\\/／]/g, "_");
}

/** Persist 網頁取數 downloads under storage/ (gitignored). */
export function saveFetchedFilesToStorage(
  fetched: FetchedIchefFiles,
  range: { startDate: string; endDate: string },
  root = process.cwd()
): { dir: string; paths: string[] } {
  const dir = storageDirForFetchRange(range, root);
  mkdirSync(dir, { recursive: true });
  const paths: string[] = [];
  const write = (filename: string, bytes: Buffer) => {
    const filePath = path.join(dir, safeFilename(filename));
    writeFileSync(filePath, bytes);
    paths.push(filePath);
  };
  write(fetched.checkout.filename, fetched.checkout.bytes);
  write(fetched.punches.filename, fetched.punches.bytes);
  write(fetched.noteOuter.filename, fetched.noteOuter.bytes);
  for (const item of fetched.noteDrilldowns) {
    write(item.file.filename, item.file.bytes);
  }
  return { dir, paths };
}
