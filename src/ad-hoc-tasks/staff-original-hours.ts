import type { StaffMaster } from "@/compile/types";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { getPeriodCatalogEntry } from "@/compile/period-catalog";
import { loadPerformanceFilesPreferringStorage } from "@/import/load-stored-ichef";
import { parsePunchFile } from "@/import/parse-punches";
import { loadStaffMastersForPeriod } from "@/staff/seed-zhongshan";

function resolveStaff(
  staff: StaffMaster[],
  nickname: string
): StaffMaster | undefined {
  return staff.find((person) =>
    [person.primaryNickname, ...person.aliases].includes(nickname)
  );
}

/** Original punch hours per primaryNickname (before 時數拆分). */
export async function loadStaffOriginalHoursForPeriod(
  periodKey: string
): Promise<Record<string, number>> {
  const catalog = getPeriodCatalogEntry(periodKey);
  const files = await loadPerformanceFilesPreferringStorage(catalog.fileRange, {
    periodKey,
  });
  if (!files?.punches) {
    return {};
  }
  const period = {
    start: new Date(catalog.businessDays.startIso),
    end: new Date(catalog.businessDays.endIso),
  };
  const punches = await parsePunchFile(files.punches, period);
  const shop =
    periodKey === catalog.periodKey && catalog.fixtureShop().staff.length > 0
      ? catalog.fixtureShop()
      : zhongshanJuly2026Shop();
  const staff = await loadStaffMastersForPeriod(periodKey);
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

/** @deprecated Use loadStaffOriginalHoursForPeriod(periodKey). */
export async function loadJuly2026StaffOriginalHours(): Promise<
  Record<string, number>
> {
  const { JULY_2026_PERIOD_KEY } = await import("@/lib/period-keys");
  return loadStaffOriginalHoursForPeriod(JULY_2026_PERIOD_KEY);
}
