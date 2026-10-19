import type { CompileResult, ShopInputs } from "@/compile/types";
import { readCompileCache, writeCompileCache } from "@/compile/compile-cache";
import { compilePayPeriod } from "@/compile/compile-pay-period";
import { buildShopInputsForPeriod } from "@/compile/build-shop-inputs";
import { loadPeriodImports } from "@/compile/load-period-imports";
import { periodLabelForImportSource } from "@/compile/period-catalog";
import { prisma } from "@/lib/prisma";
import { getPayPeriodState, isPayPeriodLocked } from "@/pay-period/state";
import { loadPeriodNicknameAttributions } from "@/pay-period/unmatched-resolutions";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type PeriodCompileResult = {
  periodLabel: string;
  periodKey: string;
  source: "storage" | "fixture" | "db";
  shop: ShopInputs;
  result: CompileResult;
};

/** Live 編成：匯入 + shop inputs + compilePayPeriod（略過快取；寫入快取）. */
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
  const payload = {
    periodLabel: periodLabelForImportSource(
      input.periodKey,
      imports.source,
      imports.noteDrilldownsFromFixtureFallback
    ),
    periodKey: input.periodKey,
    source: imports.source,
    result,
  };
  await ensurePayPeriodRow(input.storeId, input.periodKey);
  await writeCompileCache(input.storeId, input.periodKey, payload);
  return {
    ...payload,
    shop,
  };
}

/** Returns frozen snapshot when locked; else cache hit or live compile. */
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
  const cached = await readCompileCache(input.storeId, input.periodKey);
  if (cached) {
    const { shop } = await buildShopInputsForPeriod(input);
    return {
      periodLabel: cached.periodLabel,
      periodKey: cached.periodKey,
      source: cached.source,
      shop,
      result: cached.result,
    };
  }
  return compilePayPeriodLive(input);
}

/** Resolve 中山 store id and compile (pages / export convenience). */
export async function compileZhongshanPayPeriod(
  periodKey: string
): Promise<PeriodCompileResult> {
  const { prisma: db } = await import("@/lib/prisma");
  const store = await db.store.findUnique({
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
