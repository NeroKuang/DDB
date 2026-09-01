import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { CompileResult, ShopInputs } from "@/compile/types";
import {
  JULY_2026_PERIOD_KEY,
  listAdHocTasksForStoreCode,
} from "@/ad-hoc-tasks/manage";
import { compilePayPeriod } from "@/compile/compile-pay-period";
import { parseCheckoutFile } from "@/import/parse-checkout";
import { loadPerformanceFilesPreferringStorage } from "@/import/load-stored-ichef";
import {
  itemNameFromDrilldownFilename,
  parseNoteDrilldown,
  parseNoteOuterList,
} from "@/import/parse-note-analysis";
import { parsePunchFile } from "@/import/parse-punches";
import {
  JULY_2026_FILE_RANGE,
  JULY_2026_PERIOD,
} from "@/lib/july-2026-fixtures";
import { loadStaffMastersForStore } from "@/staff/seed-zhongshan";
import { listTemplateTasksForStoreCode } from "@/template-tasks/manage";
import {
  getJuly2026PayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/manage";

export type JulyPayrollCompile = {
  periodLabel: string;
  periodKey: string;
  source: "storage" | "fixture";
  shop: ShopInputs;
  result: CompileResult;
};

export async function buildJulyShopInputs(): Promise<ShopInputs> {
  const shop = zhongshanJuly2026Shop();
  const staff = await loadStaffMastersForStore();
  const templateTasks = await listTemplateTasksForStoreCode();
  const adHocTasks = await listAdHocTasksForStoreCode(JULY_2026_PERIOD_KEY);
  return {
    ...shop,
    staff: staff.length > 0 ? staff : shop.staff,
    templateTasks:
      templateTasks.length > 0 ? templateTasks : shop.templateTasks,
    adHocTasks: adHocTasks.length > 0 ? adHocTasks : shop.adHocTasks,
  };
}

/** Compile July 2026 薪資報表 from storage/ichef or fixtures + shop master. */
export async function compileJuly2026PayrollLive(): Promise<JulyPayrollCompile> {
  const files =
    await loadPerformanceFilesPreferringStorage(JULY_2026_FILE_RANGE);
  const period = {
    start: new Date(JULY_2026_PERIOD.startIso),
    end: new Date(JULY_2026_PERIOD.endIso),
  };
  if (!files.punches) {
    throw new Error("打卡檔缺失，無法編成薪資報表");
  }
  const checkoutLines = await parseCheckoutFile(files.checkout, period);
  const punches = await parsePunchFile(files.punches, period);
  const noteClicks = (
    await Promise.all(
      files.noteDrilldowns.map((filePath) =>
        parseNoteDrilldown(filePath, itemNameFromDrilldownFilename(filePath))
      )
    )
  ).flat();

  let noteOuterComplete = false;
  if (files.noteOuter) {
    try {
      const outer = await parseNoteOuterList(files.noteOuter);
      const outerNames = new Set(outer.map((item) => item.name));
      const drillNames = new Set(
        files.noteDrilldowns.map((filePath) =>
          itemNameFromDrilldownFilename(filePath)
        )
      );
      noteOuterComplete =
        outerNames.size > 0 &&
        [...outerNames].every((name) => drillNames.has(name));
    } catch {
      noteOuterComplete = false;
    }
  }

  const shop = await buildJulyShopInputs();
  const result = compilePayPeriod({
    shop,
    checkoutLines,
    punchPairs: punches.pairs,
    noteClicks,
    noteOuterComplete,
  });

  let periodLabel = "2026-07（中山・fixture）";
  if (files.source === "storage") {
    periodLabel = files.noteDrilldownsFromFixtureFallback
      ? "2026-07（中山・網頁取數；注記暫用 fixture）"
      : "2026-07（中山・網頁取數）";
  }

  return {
    periodLabel,
    periodKey: JULY_2026_PERIOD_KEY,
    source: files.source,
    shop,
    result,
  };
}

/** Returns frozen snapshot when period is locked; otherwise live compile. */
export async function compileJuly2026Payroll(): Promise<JulyPayrollCompile> {
  const periodState = await getJuly2026PayPeriodState();
  if (isPayPeriodLocked(periodState) && periodState?.snapshot) {
    const snapshot = periodState.snapshot;
    const shop = await buildJulyShopInputs();
    return {
      periodLabel: `${snapshot.periodLabel}（已鎖定）`,
      periodKey: snapshot.periodKey,
      source: "storage",
      shop,
      result: snapshot.compile,
    };
  }
  return compileJuly2026PayrollLive();
}
