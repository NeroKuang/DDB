import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { StaffMaster, TemplateTask } from "@/compile/types";
import { parseCheckoutFile } from "@/import/parse-checkout";
import type { CheckoutNoteLine } from "@/import/parse-checkout";
import {
  itemNameFromDrilldownFilename,
  parseNoteDrilldown,
} from "@/import/parse-note-analysis";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";
import {
  JULY_2026_PERIOD,
  july2026FixturePaths,
} from "@/lib/july-2026-fixtures";
import { loadStaffMastersForStore } from "@/staff/seed-zhongshan";

export type PerformancePeriodInput = {
  periodLabel: string;
  period: { start: Date; end: Date };
  checkoutLines: CheckoutNoteLine[];
  noteClicks: NoteAnalysisClick[];
  staff: StaffMaster[];
  templateTasks: TemplateTask[];
};

/** First-period demo: compile July fixtures (storage live files can replace later). */
export async function loadJuly2026PerformanceInput(): Promise<PerformancePeriodInput> {
  const paths = july2026FixturePaths();
  const period = {
    start: new Date(JULY_2026_PERIOD.startIso),
    end: new Date(JULY_2026_PERIOD.endIso),
  };
  const checkoutLines = await parseCheckoutFile(paths.checkout, period);
  const noteClicks = (
    await Promise.all(
      paths.noteDrilldowns.map((filePath) =>
        parseNoteDrilldown(filePath, itemNameFromDrilldownFilename(filePath))
      )
    )
  ).flat();
  const shop = zhongshanJuly2026Shop();
  const staff = await loadStaffMastersForStore();
  return {
    periodLabel: "2026-07（中山）",
    period,
    checkoutLines,
    noteClicks,
    staff: staff.length > 0 ? staff : shop.staff,
    templateTasks: shop.templateTasks,
  };
}
