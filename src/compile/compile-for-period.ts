import type { CompileResult, ShopInputs } from "@/compile/types";
import { compilePayPeriod } from "@/compile/compile-pay-period";
import { buildShopInputsForPeriod } from "@/compile/build-shop-inputs";
import { loadPeriodImports } from "@/compile/load-period-imports";
import { periodLabelForImportSource } from "@/compile/period-catalog";
import { prisma } from "@/lib/prisma";
import { getPayPeriodState, isPayPeriodLocked } from "@/pay-period/state";
import { loadPeriodNicknameAttributions } from "@/pay-period/unmatched-resolutions";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type PeriodCompileResult = {
  periodLabel: string;
  periodKey: string;
  source: "storage" | "fixture" | "db";
  shop: ShopInputs;
  result: CompileResult;
};

/** Live 編成：匯入 + shop inputs + compilePayPeriod. */
export async function compilePayPeriodLive(input: {
  storeId: string;
  periodKey: string;
  storeCode?: string;
}): Promise<PeriodCompileResult> {
  const imports = await loadPeriodImports(input.periodKey, {
    storeId: input.storeId,
  });
  const { shop, savedStored } = await buildShopInputsForPeriod(input);
  const periodRow = await prisma.payPeriod.findUnique({
    where: {
      storeId_periodKey: {
        storeId: input.storeId,
        periodKey: input.periodKey,
      },
    },
    select: { skippedUnmatchedNicknames: true },
  });
  const periodNicknameAttributions = await loadPeriodNicknameAttributions(
    input.storeId,
    input.periodKey
  );
  const result = compilePayPeriod({
    shop,
    checkoutLines: imports.checkoutLines,
    punchPairs: imports.punchPairs,
    noteClicks: imports.noteClicks,
    noteOuterComplete: imports.noteOuterComplete,
    savedStored,
    adminSkippedUnmatchedNicknames: periodRow?.skippedUnmatchedNicknames ?? [],
    periodNicknameAttributions,
  });
  return {
    periodLabel: periodLabelForImportSource(
      input.periodKey,
      imports.source,
      imports.noteDrilldownsFromFixtureFallback
    ),
    periodKey: input.periodKey,
    source: imports.source,
    shop,
    result,
  };
}

/** Returns frozen snapshot when locked; otherwise live compile. */
export async function compilePayPeriodForStore(input: {
  storeId: string;
  periodKey: string;
  storeCode?: string;
}): Promise<PeriodCompileResult> {
  const periodState = await getPayPeriodState(input.storeId, input.periodKey);
  if (isPayPeriodLocked(periodState) && periodState?.snapshot) {
    const snapshot = periodState.snapshot;
    const { shop } = await buildShopInputsForPeriod(input);
    return {
      periodLabel: `${snapshot.periodLabel}（已鎖定）`,
      periodKey: snapshot.periodKey,
      source: "storage",
      shop,
      result: snapshot.compile,
    };
  }
  return compilePayPeriodLive(input);
}

/** Resolve 中山 store id and compile (pages / export convenience). */
export async function compileZhongshanPayPeriod(
  periodKey: string
): Promise<PeriodCompileResult> {
  const { prisma } = await import("@/lib/prisma");
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    throw new Error("中山門市尚未初始化");
  }
  return compilePayPeriodForStore({
    storeId: store.id,
    periodKey,
    storeCode: ZHONGSHAN_STORE_CODE,
  });
}
