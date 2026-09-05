import type { AdHocTask, StaffMaster, TemplateTask } from "@/compile/types";
import { getPeriodCatalogEntry } from "@/compile/period-catalog";
import { loadPeriodImports } from "@/compile/load-period-imports";
import { parseCheckoutFile } from "@/import/parse-checkout";
import type { CheckoutNoteLine } from "@/import/parse-checkout";
import { loadPerformanceFilesPreferringStorage } from "@/import/load-stored-ichef";
import {
  buildNoteItemUnitPriceMap,
  isUsableNoteOuterForPricing,
  itemNameFromDrilldownFilename,
  mergeNoteOuterItems,
  parseNoteDrilldown,
  parseNoteOuterList,
  type NoteOuterItem,
} from "@/import/parse-note-analysis";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";
import {
  loadPosItemCatalog,
  type PosItemCatalogEntry,
} from "@/pos-items/manage";
import { isGiftItemName } from "@/pos-items/gift-item";
import { listAllAdHocTasksForStoreCode } from "@/ad-hoc-tasks/manage";
import { periodLabelForImportSource } from "@/compile/period-catalog";
import { loadPeriodNicknameAttributions } from "@/pay-period/unmatched-resolutions";
import { loadStaffMastersForPeriod } from "@/staff/seed-zhongshan";
import { listTemplateTasksForStoreCode } from "@/template-tasks/manage";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";

export type PerformancePeriodInput = {
  periodLabel: string;
  periodKey: string;
  source: "storage" | "fixture" | "db";
  noteDrilldownsFromFixtureFallback: boolean;
  period: { start: Date; end: Date };
  checkoutLines: CheckoutNoteLine[];
  noteClicks: NoteAnalysisClick[];
  itemUnitPrices: Map<string, number>;
  posItemCatalog: Map<string, PosItemCatalogEntry>;
  periodNicknameAttributions: Map<string, string>;
  staff: StaffMaster[];
  templateTasks: TemplateTask[];
  adHocTasks: AdHocTask[];
};

async function loadNoteItemUnitPricesFromStorage(
  periodKey: string,
  fileRange: { startDate: string; endDate: string },
  drilldownItemNames: readonly string[]
): Promise<Map<string, number>> {
  const files = await loadPerformanceFilesPreferringStorage(fileRange, {
    periodKey,
  });
  if (!files?.noteOuter || drilldownItemNames.length === 0) {
    return new Map();
  }
  try {
    return buildNoteItemUnitPriceMap(
      await parseNoteOuterList(files.noteOuter, [...drilldownItemNames])
    );
  } catch {
    return new Map();
  }
}

function usableNoteOuterItems(
  items: NoteOuterItem[],
  drilldownItemNames: readonly string[]
): NoteOuterItem[] {
  const merged = mergeNoteOuterItems(items);
  return isUsableNoteOuterForPricing(merged, drilldownItemNames) ? merged : [];
}

/** Align with 薪資編成：DB 匯入優先，並套用本期認列暱稱。 */
export async function loadPerformanceInput(
  periodKey: string,
  options?: { storeId?: string }
): Promise<PerformancePeriodInput> {
  const catalog = getPeriodCatalogEntry(periodKey);
  const period = {
    start: new Date(catalog.businessDays.startIso),
    end: new Date(catalog.businessDays.endIso),
  };

  let checkoutLines: CheckoutNoteLine[] = [];
  let noteClicks: NoteAnalysisClick[] = [];
  let noteOuterItems: NoteOuterItem[] = [];
  let source: PerformancePeriodInput["source"] = "storage";
  let noteDrilldownsFromFixtureFallback = false;

  if (options?.storeId) {
    try {
      const imports = await loadPeriodImports(periodKey, {
        storeId: options.storeId,
      });
      checkoutLines = imports.checkoutLines;
      noteClicks = imports.noteClicks;
      noteOuterItems = imports.noteOuterItems;
      source = imports.source;
      noteDrilldownsFromFixtureFallback =
        imports.noteDrilldownsFromFixtureFallback;
    } catch {
      // fall through to storage
    }
  }

  if (checkoutLines.length === 0 && noteClicks.length === 0) {
    const files = await loadPerformanceFilesPreferringStorage(
      catalog.fileRange,
      {
        periodKey,
      }
    );
    if (!files) {
      throw new Error(
        `本期（${periodKey}）尚無 iCHEF 匯入，請先對該月執行網頁取數或上傳。`
      );
    }
    checkoutLines = await parseCheckoutFile(files.checkout, period);
    noteClicks = (
      await Promise.all(
        files.noteDrilldowns.map((filePath) =>
          parseNoteDrilldown(filePath, itemNameFromDrilldownFilename(filePath))
        )
      )
    ).flat();
    source = files.source;
    noteDrilldownsFromFixtureFallback = files.noteDrilldownsFromFixtureFallback;
  }

  const drilldownItemNames = [
    ...new Set(noteClicks.map((click) => click.itemName)),
  ];

  let itemUnitPrices = new Map<string, number>();
  let posItemCatalog = new Map<string, PosItemCatalogEntry>();
  if (options?.storeId) {
    posItemCatalog = await loadPosItemCatalog(options.storeId);
    itemUnitPrices = new Map(
      [...posItemCatalog.entries()].map(([name, entry]) => [
        name,
        entry.unitPrice,
      ])
    );
  }

  if (posItemCatalog.size === 0) {
    const pricedOuter = usableNoteOuterItems(
      noteOuterItems,
      drilldownItemNames
    );
    if (pricedOuter.length > 0) {
      itemUnitPrices = buildNoteItemUnitPriceMap(pricedOuter);
      for (const [name, unitPrice] of itemUnitPrices) {
        posItemCatalog.set(name, {
          unitPrice,
          isGift: isGiftItemName(name),
        });
      }
    }
  }

  if (posItemCatalog.size === 0) {
    itemUnitPrices = await loadNoteItemUnitPricesFromStorage(
      periodKey,
      catalog.fileRange,
      drilldownItemNames
    );
    for (const [name, unitPrice] of itemUnitPrices) {
      posItemCatalog.set(name, {
        unitPrice,
        isGift: isGiftItemName(name),
      });
    }
  }

  const periodNicknameAttributions = options?.storeId
    ? await loadPeriodNicknameAttributions(options.storeId, periodKey)
    : new Map<string, string>();

  const fixture = catalog.fixtureShop();
  const fallbackShop =
    fixture.staff.length > 0 ? fixture : zhongshanJuly2026Shop();
  const staff = await loadStaffMastersForPeriod(periodKey);
  const templateTasks = await listTemplateTasksForStoreCode();
  const adHocTasks = await listAllAdHocTasksForStoreCode(periodKey);

  return {
    periodLabel: periodLabelForImportSource(
      periodKey,
      source,
      noteDrilldownsFromFixtureFallback
    ),
    periodKey,
    source,
    noteDrilldownsFromFixtureFallback,
    period,
    checkoutLines,
    noteClicks,
    itemUnitPrices,
    posItemCatalog,
    periodNicknameAttributions,
    staff: staff.length > 0 ? staff : fallbackShop.staff,
    templateTasks:
      templateTasks.length > 0 ? templateTasks : fallbackShop.templateTasks,
    adHocTasks:
      adHocTasks.length > 0
        ? adHocTasks
        : fallbackShop.adHocTasks.map((task) => ({
            ...task,
            confirmed: true,
          })),
  };
}

/** @deprecated Use loadPerformanceInput(periodKey). */
export async function loadJuly2026PerformanceInput(): Promise<PerformancePeriodInput> {
  return loadPerformanceInput(JULY_2026_PERIOD_KEY);
}
