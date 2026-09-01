import type { AccountRole } from "@prisma/client";
import type { CompileResult } from "@/compile/types";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { prisma } from "@/lib/prisma";
import { analyzeAllStaffPerformance } from "@/performance/analyze-staff-performance";
import type { StaffPerformanceView } from "@/performance/analyze-staff-performance";
import { loadJuly2026PerformanceInput } from "@/performance/load-july-performance";
import { compilePayPeriodLive } from "@/compile/compile-for-period";
import {
  parsePeriodSnapshot,
  serializePeriodSnapshot,
  type PeriodSnapshot,
} from "@/pay-period/snapshot";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type PayPeriodState = {
  id: string;
  storeId: string;
  periodKey: string;
  lockedAt: Date | null;
  snapshot: PeriodSnapshot | null;
};

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can lock or unlock 薪資期間");
  }
}

export async function getPayPeriodState(
  storeId: string,
  periodKey: string
): Promise<PayPeriodState | null> {
  const row = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    storeId: row.storeId,
    periodKey: row.periodKey,
    lockedAt: row.lockedAt,
    snapshot: row.snapshotJson ? parsePeriodSnapshot(row.snapshotJson) : null,
  };
}

export async function getJuly2026PayPeriodState(): Promise<PayPeriodState | null> {
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return null;
  }
  return getPayPeriodState(store.id, JULY_2026_PERIOD_KEY);
}

export function isPayPeriodLocked(state: PayPeriodState | null): boolean {
  return Boolean(state?.lockedAt && state.snapshot);
}

export async function assertPayPeriodUnlocked(
  storeId: string,
  periodKey: string
): Promise<void> {
  const state = await getPayPeriodState(storeId, periodKey);
  if (isPayPeriodLocked(state)) {
    throw new Error("本期已鎖定，請先解鎖再修改");
  }
}

export async function buildJuly2026PeriodSnapshot(
  storeId: string
): Promise<PeriodSnapshot> {
  const compiled = await compilePayPeriodLive({
    storeId,
    periodKey: JULY_2026_PERIOD_KEY,
  });
  const perfInput = await loadJuly2026PerformanceInput();
  const performanceSummaries = analyzeAllStaffPerformance({
    allStaff: perfInput.staff,
    checkoutLines: perfInput.checkoutLines,
    noteClicks: perfInput.noteClicks,
    templateTasks: perfInput.templateTasks,
    adHocTasks: perfInput.adHocTasks,
  });
  return {
    version: 1,
    periodLabel: compiled.periodLabel,
    periodKey: compiled.periodKey,
    lockedAtIso: new Date().toISOString(),
    compile: compiled.result,
    performanceSummaries,
  };
}

export async function lockPayPeriod(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
}): Promise<PayPeriodState> {
  requireAdmin(input.actorRole);
  if (input.periodKey !== JULY_2026_PERIOD_KEY) {
    throw new Error("第一期僅支援鎖定 2026-07");
  }
  const live = await compilePayPeriodLive({
    storeId: input.storeId,
    periodKey: input.periodKey,
  });
  if (!live.result.lockEligible) {
    throw new Error("未對上的暱稱未清空或必要匯入未齊，無法鎖定本期");
  }
  const snapshot = await buildJuly2026PeriodSnapshot(input.storeId);
  snapshot.lockedAtIso = new Date().toISOString();
  const row = await prisma.payPeriod.upsert({
    where: {
      storeId_periodKey: {
        storeId: input.storeId,
        periodKey: input.periodKey,
      },
    },
    create: {
      storeId: input.storeId,
      periodKey: input.periodKey,
      lockedAt: new Date(snapshot.lockedAtIso),
      snapshotJson: serializePeriodSnapshot(snapshot),
    },
    update: {
      lockedAt: new Date(snapshot.lockedAtIso),
      snapshotJson: serializePeriodSnapshot(snapshot),
    },
  });
  return {
    id: row.id,
    storeId: row.storeId,
    periodKey: row.periodKey,
    lockedAt: row.lockedAt,
    snapshot,
  };
}

export async function unlockPayPeriod(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const row = await prisma.payPeriod.findUnique({
    where: {
      storeId_periodKey: {
        storeId: input.storeId,
        periodKey: input.periodKey,
      },
    },
  });
  if (!row?.lockedAt) {
    throw new Error("本期尚未鎖定");
  }
  await prisma.payPeriod.update({
    where: { id: row.id },
    data: { lockedAt: null, snapshotJson: null },
  });
}

export function frozenCompileFromSnapshot(
  snapshot: PeriodSnapshot
): CompileResult {
  return snapshot.compile;
}

export function frozenPerformanceSummaries(
  snapshot: PeriodSnapshot
): StaffPerformanceView[] {
  return snapshot.performanceSummaries;
}

export function frozenPerformanceForNickname(
  snapshot: PeriodSnapshot,
  nickname: string
): StaffPerformanceView | undefined {
  return snapshot.performanceSummaries.find(
    (view) => view.primaryNickname === nickname
  );
}
