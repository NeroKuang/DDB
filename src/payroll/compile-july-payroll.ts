import type { CompileResult, ShopInputs } from "@/compile/types";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import {
  buildShopInputsForPeriod,
  type CompileShopBundle,
} from "@/compile/build-shop-inputs";
import {
  compilePayPeriodForStore,
  compilePayPeriodLive,
  compileZhongshanPayPeriod,
  type PeriodCompileResult,
} from "@/compile/compile-for-period";

export type JulyPayrollCompile = PeriodCompileResult;

/** @deprecated Use buildShopInputsForPeriod({ storeId, periodKey }). */
export async function buildJulyShopInputs(): Promise<ShopInputs> {
  const { prisma } = await import("@/lib/prisma");
  const store = await prisma.store.findUnique({
    where: { code: "zhongshan" },
  });
  if (!store) {
    const { getPeriodCatalogEntry } = await import("@/compile/period-catalog");
    return getPeriodCatalogEntry(JULY_2026_PERIOD_KEY).fixtureShop();
  }
  const bundle = await buildShopInputsForPeriod({
    storeId: store.id,
    periodKey: JULY_2026_PERIOD_KEY,
  });
  return bundle.shop;
}

/** @deprecated Use compilePayPeriodLive({ storeId, periodKey }). */
export async function compileJuly2026PayrollLive(): Promise<JulyPayrollCompile> {
  const { prisma } = await import("@/lib/prisma");
  const store = await prisma.store.findUnique({
    where: { code: "zhongshan" },
  });
  if (!store) {
    throw new Error("中山門市尚未初始化");
  }
  return compilePayPeriodLive({
    storeId: store.id,
    periodKey: JULY_2026_PERIOD_KEY,
  });
}

/** @deprecated Use compileZhongshanPayPeriod(periodKey) or compilePayPeriodForStore. */
export async function compileJuly2026Payroll(): Promise<JulyPayrollCompile> {
  return compileZhongshanPayPeriod(JULY_2026_PERIOD_KEY);
}

export { buildShopInputsForPeriod, type CompileShopBundle };
