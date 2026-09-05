import type { StaffMaster } from "@/compile/types";
import {
  analyzeAllStaffPerformance,
  type StaffPerformanceView,
} from "@/performance/analyze-staff-performance";
import type { PerformancePeriodInput } from "@/performance/load-performance-input";

/** One analysis pass for a 薪資期間 (list + detail must share this). */
export function buildStaffPerformanceViews(
  input: PerformancePeriodInput
): StaffPerformanceView[] {
  return analyzeAllStaffPerformance({
    allStaff: input.staff,
    checkoutLines: input.checkoutLines,
    noteClicks: input.noteClicks,
    itemUnitPrices: input.itemUnitPrices,
    posItemCatalog: input.posItemCatalog,
    periodNicknameAttributions: input.periodNicknameAttributions,
    templateTasks: input.templateTasks,
    adHocTasks: input.adHocTasks,
  });
}

export function pickStaffPerformanceView(
  views: readonly StaffPerformanceView[],
  staff: StaffMaster
): StaffPerformanceView | undefined {
  return views.find((view) => view.primaryNickname === staff.primaryNickname);
}
