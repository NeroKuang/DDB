import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { compilePayPeriodLive } from "@/compile/compile-for-period";
import { isMinioConfigured } from "@/import/minio-object-store";
import { prisma } from "@/lib/prisma";
import { getPayPeriodState, isPayPeriodLocked } from "@/pay-period/state";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { getWebFetchProgress } from "@/web-fetch/manage";
import {
  buildPeriodDashboardAlerts,
  type DashboardAlert,
} from "@/dashboard/build-alerts";
import { analyzePosItemHealth } from "@/pos-items/health";
import { listPosItemsForStore } from "@/pos-items/manage";

export type PeriodDashboardStatus = {
  storeId: string;
  periodKey: string;
  periodLabel: string | null;
  locked: boolean;
  compileError: string | null;
  fetch: Awaited<ReturnType<typeof getWebFetchProgress>> | null;
  importSource: "db" | "storage" | "fixture" | null;
  requiredImportsComplete: boolean;
  lockEligible: boolean;
  payRowCount: number;
  unmatchedNicknameCount: number;
  unmatchedClickCount: number;
  topUnmatchedNicknames: { nickname: string; amount: number }[];
  hasImportRun: boolean;
  lastImportAt: Date | null;
  lastImportSource: string | null;
  minioConfigured: boolean;
  alerts: DashboardAlert[];
};

export async function loadPeriodDashboard(input: {
  storeId: string;
  periodKey?: string;
  canViewFetch: boolean;
  isAdmin: boolean;
}): Promise<PeriodDashboardStatus> {
  const periodKey = input.periodKey ?? JULY_2026_PERIOD_KEY;
  const periodState = await getPayPeriodState(input.storeId, periodKey);
  const locked = isPayPeriodLocked(periodState);

  const payPeriod = await prisma.payPeriod.findUnique({
    where: {
      storeId_periodKey: { storeId: input.storeId, periodKey },
    },
    select: {
      activeImportRunId: true,
      importRuns: {
        where: { status: "SUCCEEDED" },
        orderBy: { finishedAt: "desc" },
        take: 1,
        select: { finishedAt: true, source: true },
      },
    },
  });

  const lastImport = payPeriod?.importRuns[0] ?? null;
  const hasImportRun = Boolean(payPeriod?.activeImportRunId ?? lastImport);

  let periodLabel: string | null = null;
  let importSource: PeriodDashboardStatus["importSource"] = null;
  let requiredImportsComplete = false;
  let lockEligible = false;
  let payRowCount = 0;
  let unmatchedNicknameCount = 0;
  let unmatchedClickCount = 0;
  let topUnmatchedNicknames: { nickname: string; amount: number }[] = [];
  let compileError: string | null = null;

  try {
    const compiled = await compilePayPeriodLive({
      storeId: input.storeId,
      periodKey,
    });
    periodLabel = compiled.periodLabel;
    importSource = compiled.source;
    requiredImportsComplete = compiled.result.requiredImportsComplete;
    lockEligible = compiled.result.lockEligible;
    payRowCount = compiled.result.payRows.length;
    unmatchedNicknameCount = compiled.result.blockingUnmatchedNicknames.length;
    unmatchedClickCount = compiled.result.unmatchedClicks.length;
    topUnmatchedNicknames = compiled.result.blockingUnmatchedNicknames.slice(
      0,
      5
    );
  } catch (error) {
    compileError = error instanceof Error ? error.message : "編成失敗";
  }

  const fetch = input.canViewFetch
    ? await getWebFetchProgress(input.storeId, periodKey)
    : null;

  const minioConfigured = isMinioConfigured();
  const posItems = input.isAdmin
    ? await listPosItemsForStore(input.storeId)
    : [];
  const posHealth = analyzePosItemHealth(posItems);
  const alerts = buildPeriodDashboardAlerts({
    locked,
    compileError,
    fetch,
    importSource,
    requiredImportsComplete,
    lockEligible,
    unmatchedNicknameCount,
    unmatchedClickCount,
    minioConfigured,
    isAdmin: input.isAdmin,
    hasImportRun,
    posItemZeroPriceCount: posHealth.zeroPriceBillableCount,
    posItemAllBillableZero: posHealth.allBillableZero,
  });

  return {
    storeId: input.storeId,
    periodKey,
    periodLabel,
    locked,
    compileError,
    fetch,
    importSource,
    requiredImportsComplete,
    lockEligible,
    payRowCount,
    unmatchedNicknameCount,
    unmatchedClickCount,
    topUnmatchedNicknames,
    hasImportRun,
    lastImportAt: lastImport?.finishedAt ?? null,
    lastImportSource: lastImport?.source ?? null,
    minioConfigured,
    alerts,
  };
}

export async function loadZhongshanPeriodDashboard(input: {
  canViewFetch: boolean;
  isAdmin: boolean;
  periodKey?: string;
}): Promise<PeriodDashboardStatus | null> {
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    select: { id: true },
  });
  if (!store) {
    return null;
  }
  return loadPeriodDashboard({
    storeId: store.id,
    periodKey: input.periodKey,
    canViewFetch: input.canViewFetch,
    isAdmin: input.isAdmin,
  });
}
