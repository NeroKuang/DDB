import type { Rollup, ShopInputs } from "@/compile/types";
import { listAdHocTasksForStoreCode } from "@/ad-hoc-tasks/manage";
import { getPeriodCatalogEntry } from "@/compile/period-catalog";
import { loadPeriodStaffInputs } from "@/pay-period-staff/manage";
import {
  loadSavedStoredMap,
  type SavedStoredMap,
} from "@/pay-row-stored/manage";
import { loadStaffMastersForPeriod } from "@/staff/seed-zhongshan";
import { listTemplateTasksForStoreCode } from "@/template-tasks/manage";
import { prisma } from "@/lib/prisma";

export type CompileShopBundle = {
  shop: ShopInputs;
  savedStored: SavedStoredMap;
};

const VALID_ROLLUPS = new Set<Rollup>([
  "none",
  "addToMonthlyPay",
  "addToNetPay",
  "subtractFromNetPay",
]);

function parseRollupsJson(
  raw: string | null | undefined
): Record<string, Rollup> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, Rollup> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && VALID_ROLLUPS.has(value as Rollup)) {
        out[key] = value as Rollup;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Single entry for 編成 module shop-side inputs: master, period staff, tasks, stored overrides.
 */
export async function buildShopInputsForPeriod(input: {
  storeId: string;
  periodKey: string;
  storeCode?: string;
}): Promise<CompileShopBundle> {
  const storeCode = input.storeCode ?? "zhongshan";
  const fixture = getPeriodCatalogEntry(input.periodKey).fixtureShop();
  const storeRow = await prisma.store.findUnique({
    where: { id: input.storeId },
    select: {
      demeritUnitAmount: true,
      rollupsJson: true,
      customSalaryItems: {
        where: { archivedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, rollup: true },
      },
    },
  });
  const staff = await loadStaffMastersForPeriod(input.periodKey, storeCode);
  const templateTasks = await listTemplateTasksForStoreCode(storeCode);
  const adHocTasks = await listAdHocTasksForStoreCode(input.periodKey);
  const periodStaff = await loadPeriodStaffInputs(
    input.storeId,
    input.periodKey
  );
  const savedStored = await loadSavedStoredMap(input.storeId, input.periodKey);
  const customSalaryItems = (storeRow?.customSalaryItems ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    rollup: VALID_ROLLUPS.has(item.rollup as Rollup)
      ? (item.rollup as Rollup)
      : ("addToMonthlyPay" as Rollup),
  }));
  return {
    shop: {
      ...fixture,
      demeritUnitAmount:
        storeRow?.demeritUnitAmount ?? fixture.demeritUnitAmount,
      rollups: {
        ...fixture.rollups,
        ...parseRollupsJson(storeRow?.rollupsJson),
      },
      customSalaryItems,
      staff: staff.length > 0 ? staff : fixture.staff,
      periodStaff,
      templateTasks:
        templateTasks.length > 0 ? templateTasks : fixture.templateTasks,
      adHocTasks: adHocTasks.length > 0 ? adHocTasks : fixture.adHocTasks,
    },
    savedStored,
  };
}
