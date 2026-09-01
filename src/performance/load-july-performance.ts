import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { StaffMaster, TemplateTask } from "@/compile/types";
import { parseCheckoutFile } from "@/import/parse-checkout";
import type { CheckoutNoteLine } from "@/import/parse-checkout";
import { loadPerformanceFilesPreferringStorage } from "@/import/load-stored-ichef";
import {
  itemNameFromDrilldownFilename,
  parseNoteDrilldown,
} from "@/import/parse-note-analysis";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";
import {
  JULY_2026_FILE_RANGE,
  JULY_2026_PERIOD,
} from "@/lib/july-2026-fixtures";
import { loadStaffMastersForStore } from "@/staff/seed-zhongshan";
import { listTemplateTasksForStoreCode } from "@/template-tasks/manage";

export type PerformancePeriodInput = {
  periodLabel: string;
  source: "storage" | "fixture";
  noteDrilldownsFromFixtureFallback: boolean;
  period: { start: Date; end: Date };
  checkoutLines: CheckoutNoteLine[];
  noteClicks: NoteAnalysisClick[];
  staff: StaffMaster[];
  templateTasks: TemplateTask[];
};

/** July 2026 業績面: prefer storage/ichef live 網頁取數, else repo fixtures. */
export async function loadJuly2026PerformanceInput(): Promise<PerformancePeriodInput> {
  const files =
    await loadPerformanceFilesPreferringStorage(JULY_2026_FILE_RANGE);
  const period = {
    start: new Date(JULY_2026_PERIOD.startIso),
    end: new Date(JULY_2026_PERIOD.endIso),
  };
  const checkoutLines = await parseCheckoutFile(files.checkout, period);
  const noteClicks = (
    await Promise.all(
      files.noteDrilldowns.map((filePath) =>
        parseNoteDrilldown(filePath, itemNameFromDrilldownFilename(filePath))
      )
    )
  ).flat();
  const shop = zhongshanJuly2026Shop();
  const staff = await loadStaffMastersForStore();
  const templateTasks = await listTemplateTasksForStoreCode();

  let periodLabel = "2026-07（中山・fixture）";
  if (files.source === "storage") {
    periodLabel = files.noteDrilldownsFromFixtureFallback
      ? "2026-07（中山・網頁取數；注記暫用 fixture）"
      : "2026-07（中山・網頁取數）";
  }

  return {
    periodLabel,
    source: files.source,
    noteDrilldownsFromFixtureFallback: files.noteDrilldownsFromFixtureFallback,
    period,
    checkoutLines,
    noteClicks,
    staff: staff.length > 0 ? staff : shop.staff,
    templateTasks:
      templateTasks.length > 0 ? templateTasks : shop.templateTasks,
  };
}
