import type { StaffMaster } from "@/compile/types";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { loadPerformanceFilesPreferringStorage } from "@/import/load-stored-ichef";
import { parsePunchFile } from "@/import/parse-punches";
import {
  JULY_2026_FILE_RANGE,
  JULY_2026_PERIOD,
} from "@/lib/july-2026-fixtures";
import { loadStaffMastersForStore } from "@/staff/seed-zhongshan";

function resolveStaff(
  staff: StaffMaster[],
  nickname: string
): StaffMaster | undefined {
  return staff.find((person) =>
    [person.primaryNickname, ...person.aliases].includes(nickname)
  );
}

/** Original punch hours per primaryNickname for July 2026 (before 時數拆分). */
export async function loadJuly2026StaffOriginalHours(): Promise<
  Record<string, number>
> {
  const files =
    await loadPerformanceFilesPreferringStorage(JULY_2026_FILE_RANGE);
  if (!files.punches) {
    return {};
  }
  const period = {
    start: new Date(JULY_2026_PERIOD.startIso),
    end: new Date(JULY_2026_PERIOD.endIso),
  };
  const punches = await parsePunchFile(files.punches, period);
  const shop = zhongshanJuly2026Shop();
  const staff = await loadStaffMastersForStore();
  const masters = staff.length > 0 ? staff : shop.staff;
  const hours: Record<string, number> = {};
  for (const pair of punches.pairs) {
    const person = resolveStaff(masters, pair.nickname);
    if (!person) {
      continue;
    }
    hours[person.primaryNickname] =
      (hours[person.primaryNickname] ?? 0) + pair.hours;
  }
  return hours;
}
