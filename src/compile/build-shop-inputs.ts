import type { PayRowOriginals, ShopInputs, Venue } from "@/compile/types";
import { listAdHocTasksForStoreCode } from "@/ad-hoc-tasks/manage";
import { getPeriodCatalogEntry } from "@/compile/period-catalog";
import { loadPeriodStaffInputs } from "@/pay-period-staff/manage";
import { loadSavedStoredMap } from "@/pay-row-stored/manage";
import { loadStaffMastersForStore } from "@/staff/seed-zhongshan";
import { listTemplateTasksForStoreCode } from "@/template-tasks/manage";

export type CompileShopBundle = {
  shop: ShopInputs;
  savedStored: Record<string, Partial<Record<Venue, Partial<PayRowOriginals>>>>;
};

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
  const staff = await loadStaffMastersForStore(storeCode);
  const templateTasks = await listTemplateTasksForStoreCode(storeCode);
  const adHocTasks = await listAdHocTasksForStoreCode(input.periodKey);
  const periodStaff = await loadPeriodStaffInputs(
    input.storeId,
    input.periodKey
  );
  const savedStored = await loadSavedStoredMap(input.storeId, input.periodKey);
  return {
    shop: {
      ...fixture,
      staff: staff.length > 0 ? staff : fixture.staff,
      periodStaff,
      templateTasks:
        templateTasks.length > 0 ? templateTasks : fixture.templateTasks,
      adHocTasks: adHocTasks.length > 0 ? adHocTasks : fixture.adHocTasks,
    },
    savedStored,
  };
}
