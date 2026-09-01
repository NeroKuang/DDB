import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { storageDirForFetchRange } from "@/fetch/save-fetched-to-storage";
import { listStoredIchefPaths } from "@/import/load-stored-ichef";

export type UploadFileInput = {
  filename: string;
  bytes: Buffer;
};

const NON_DRILLDOWN = /^(結帳|打卡紀錄|modifier-analysis|文字註記分析)/;

function safeFilename(name: string): string {
  return path.basename(name).replace(/[\\/／]/g, "_");
}

export function classifyUploadedFiles(files: UploadFileInput[]): {
  checkout?: UploadFileInput;
  punches?: UploadFileInput;
  noteOuter?: UploadFileInput;
  drilldowns: UploadFileInput[];
  unknown: UploadFileInput[];
} {
  let checkout: UploadFileInput | undefined;
  let punches: UploadFileInput | undefined;
  let noteOuter: UploadFileInput | undefined;
  const drilldowns: UploadFileInput[] = [];
  const unknown: UploadFileInput[] = [];

  for (const file of files) {
    const name = safeFilename(file.filename);
    if (!name.toLowerCase().endsWith(".xlsx")) {
      unknown.push(file);
      continue;
    }
    if (name.startsWith("結帳")) {
      checkout = { ...file, filename: name };
    } else if (name.startsWith("打卡紀錄")) {
      punches = { ...file, filename: name };
    } else if (name.startsWith("modifier-analysis")) {
      noteOuter = { ...file, filename: name };
    } else if (!NON_DRILLDOWN.test(name)) {
      drilldowns.push({ ...file, filename: name });
    } else {
      unknown.push(file);
    }
  }
  return { checkout, punches, noteOuter, drilldowns, unknown };
}

export function validateUploadSet(files: UploadFileInput[]): void {
  if (files.length === 0) {
    throw new Error("請選擇至少一個 xlsx 檔案");
  }
  const classified = classifyUploadedFiles(files);
  if (classified.unknown.length > 0) {
    throw new Error(
      `無法辨識的檔案：${classified.unknown.map((f) => f.filename).join("、")}`
    );
  }
  if (!classified.checkout) {
    throw new Error("缺少結帳／作廢紀錄 xlsx");
  }
  if (!classified.punches) {
    throw new Error("缺少打卡紀錄 xlsx");
  }
  if (!classified.noteOuter) {
    throw new Error("缺少 modifier-analysis（注記分析外層）xlsx");
  }
  if (classified.drilldowns.length === 0) {
    throw new Error("缺少至少一個注記分析品項明細 xlsx");
  }
}

/** All-or-nothing replace under storage/ichef/<range>. */
export function saveUploadedIchefFiles(
  files: UploadFileInput[],
  range: { startDate: string; endDate: string },
  root = process.cwd()
): { dir: string; fileCount: number } {
  validateUploadSet(files);
  const dir = storageDirForFetchRange(range, root);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const name = safeFilename(file.filename);
    writeFileSync(path.join(dir, name), file.bytes);
  }
  const listed = listStoredIchefPaths(range, root);
  if (
    !listed?.punches ||
    !listed.noteOuter ||
    listed.noteDrilldowns.length === 0
  ) {
    throw new Error("上傳後檔案不完整");
  }
  return { dir, fileCount: files.length };
}
