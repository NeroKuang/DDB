import path from "path";
import { existsSync } from "fs";

/** Checked-in iCHEF exports covering 營業日 2026-07-01 12:00–2026-08-01 12:00 (file range 6/30–8/1). */
export const JULY_2026_PERIOD = {
  startIso: "2026-07-01T12:00:00+08:00",
  endIso: "2026-08-01T12:00:00+08:00",
} as const;

export const JULY_2026_FILE_RANGE = {
  startDate: "2026-06-30",
  endDate: "2026-08-01",
} as const;

export function july2026FixturePaths(root = process.cwd()) {
  return {
    checkout: path.join(root, "結帳／作廢紀錄_2026-06-30~2026-08-01.xlsx"),
    punches: path.join(root, "打卡紀錄_2026-06-30~2026-08-01.xlsx"),
    noteOuter: path.join(root, "modifier-analysis_2026-06-30~2026-08-01.xlsx"),
    noteDrilldowns: [
      path.join(root, "修女貪杯_2026-06-30~2026-08-01.xlsx"),
      path.join(root, "傳統禱告拍立得_2026-06-30~2026-08-01.xlsx"),
    ],
    northStarCsv: path.join(root, "7月報表-中山 - 7月.csv"),
  };
}

/** True when July regression xlsx exist on disk (local/CI). False in Docker images that omit fixtures. */
export function july2026FixturesPresent(root = process.cwd()): boolean {
  const paths = july2026FixturePaths(root);
  return existsSync(paths.checkout) && existsSync(paths.punches);
}
